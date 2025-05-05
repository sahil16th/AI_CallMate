const express = require('express');
const twilio = require('twilio');
const axios = require('axios');
const mongoose = require('mongoose');
const bodyParser = require('body-parser');
const cors = require('cors');
require('dotenv').config();

const Call = require('./models/models');

const app = express();
app.use(cors({ origin: '*' }));
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
.then(() => console.log("✅ MongoDB connected"))
.catch(err => console.error("❌ MongoDB connection error:", err));

app.get('/', (req, res) => {
  res.send("✅ Voice Interview Bot is running.");
});

let Voice_Gender = '';
// Start call sequence
app.post('/start-call', async (req, res) => {
  const { phoneNumbers, prompt, gender } = req.body;
  Voice_Gender = gender === 'male' ? 'man' : 'woman';
  
  console.log(Voice_Gender);
  try {
    const call = await Call.create({
      phoneNumbers,
      currentIndex: 0,
      prompt,
      questions: [],
      responses: [],
      status: 'ready',
    });

    await makeCall(call);
    res.json({ message: '📞 Call started to first number.' });
  } catch (error) {
    console.error('❌ Error starting call:', error);
    res.status(500).json({ error: 'Failed to start call.' });
  }
});

// Function to call current number
async function makeCall(call) {
  const twilioClient = twilio(process.env.TWILIO_SID, process.env.TWILIO_AUTH);
  const currentNumber = call.phoneNumbers[call.currentIndex];

  if (!currentNumber) {
    console.log("✅ All numbers completed.");
    return;
  }

  console.log(`📞 Calling: ${currentNumber}`);

  await twilioClient.calls.create({
    url: `${process.env.BASE_URL}/twilio/voice/${call._id}`,
    to: currentNumber,
    from: '+15704389968',
    statusCallback: `${process.env.BASE_URL}/twilio/status/${call._id}`,
    statusCallbackEvent: ['completed'],
    statusCallbackMethod: 'POST',
  });
}

// Handle incoming call
app.post('/twilio/voice/:id', async (req, res) => {
  const label = `⏱️ /twilio/voice total [${req.params.id}]`;
  console.time(label);

  console.log("📞 Call initiated:", req.params.id);
  const twiml = new twilio.twiml.VoiceResponse();

  try {
    const call = await Call.findById(req.params.id);
    if (!call) throw new Error("Call not found");

    const idx = call.currentIndex;
    call.questions[idx] = call.questions[idx] || [];
    call.responses[idx] = call.responses[idx] || [];

    if (call.status === 'waiting_for_response' || call.status === 'processing_response') {
      twiml.say({ voice: Voice_Gender },"Please hold while we process your last response.");
      twiml.pause({ length: 2 });
      twiml.redirect(`${process.env.BASE_URL}/twilio/voice/${call._id}`);
      res.type('text/xml');
      return res.send(twiml.toString());
    }

    if (call.status === 'ready') {
      const question = await getNextQuestion(call);

      if (question) {
        call.questions[idx].push(question);
        call.status = 'waiting_for_response';
        await call.save();

        twiml.say({ voice: Voice_Gender },question);
        twiml.record({
          transcribe: true,
          transcribeCallback: `${process.env.BASE_URL}/twilio/transcription/${call._id}`,
          maxLength: 10,
          language: 'en-IN',
          trim: 'trim-silence',
        });
      } else {
        twiml.say({ voice: Voice_Gender },"Thank you for your time. Goodbye.");
        call.status = 'completed';
        await call.save();
        await generateSummary(call._id);
      }

      res.type('text/xml');
      return res.send(twiml.toString());
    }

    // Fallback
    twiml.say({ voice: Voice_Gender },"Unexpected call status. Ending call.");
    res.type('text/xml');
    res.send(twiml.toString());
  } catch (err) {
    console.error('❌ /twilio/voice error:', err.message || err);
    twiml.say({ voice: Voice_Gender },"An error occurred.");
    res.type('text/xml');
    res.send(twiml.toString());
  } finally {
    console.timeEnd(label);
  }
})

// Handle transcription
app.post('/twilio/transcription/:id', async (req, res) => {
  console.time("📝 Transcription handling");
  try {
    const call = await Call.findById(req.params.id);
    if (!call) throw new Error("Call not found");

    if (call.status === 'processing_response') {
      console.log("⚠️ Already processing.");
      return res.status(200).end();
    }

    call.status = 'processing_response';
    await call.save();

    const transcription = req.body.TranscriptionText?.trim();
    const idx = call.currentIndex;

    if (transcription) {
      call.responses[idx].push(transcription);
      console.log("📝 Transcription received:", transcription);
    } else {
      console.log("⚠️ Empty transcription.");
    }

    call.status = 'ready';
    await call.save();
    return res.status(200).end();
  } catch (err) {
    console.error("❌ /transcription error:", err.message || err);
    const twiml = new twilio.twiml.VoiceResponse();
    twiml.say({ voice: Voice_Gender },"An error occurred.");
    res.type('text/xml');
    res.send(twiml.toString());
  }
  console.timeEnd("📝 Transcription handling");
});

// Call status: move to next
app.post('/twilio/status/:id', async (req, res) => {
  try {
    const call = await Call.findById(req.params.id);
    if (!call) throw new Error("Call not found");

    console.log(`📞 Call with ${call.phoneNumbers[call.currentIndex]} ended.`);

    call.currentIndex += 1;
    if (call.currentIndex < call.phoneNumbers.length) {
      call.questions.push([]);
      call.responses.push([]);
      await call.save();
      await makeCall(call);
    } else {
      call.status = 'completed';
      await call.save();
      await generateSummary(call._id);
      console.log("✅ All calls complete. Summary generated.");
    }

    res.status(200).send('✅ Status handled');
  } catch (err) {
    console.error("❌ /status error:", err.message || err);
    res.status(500).send('Error handling status');
  }
});


async function getNextQuestion(call) {
  console.time("🧠 Groq: getNextQuestion");
  const idx = call.currentIndex;

  const messages = [
    { role: "system", content: "You are an intelligent interviewer. Ask relevant follow-up questions based on previous answers." },
    { role: "user", content: call.prompt }
  ];

  for (let i = 0; i < (call.questions[idx] || []).length; i++) {
    const q = call.questions[idx][i];
    const a = call.responses[idx][i];
    if (q && a) {
      messages.push({ role: "assistant", content: q });
      messages.push({ role: "user", content: a });
    }
  }

  try {
    const response = await axios.post(
      'https://api.groq.com/openai/v1/chat/completions',
      {
        model: 'llama3-70b-8192',
        messages,
        temperature: 0.7
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.GROQ_API_KEY}`
        }
      }
    );

    const next = response.data.choices?.[0]?.message?.content?.trim();
    console.log("🤖 Groq question:", next);
    console.timeEnd("🧠 Groq: getNextQuestion");
    return next || null;
  } catch (err) {
    console.error('❌ Groq error:', err.response?.data || err.message);
    return null;
  }
}

async function generateSummary(callId) {
  const call = await Call.findById(callId);
  let convo = '';

  call.questions.forEach((qList, i) => {
    const aList = call.responses[i] || [];
    convo += `\n\n📞 Interview ${i + 1}:\n`;
    qList.forEach((q, j) => {
      convo += `Q: ${q}\nA: ${aList[j] || 'No answer'}\n`;
    });
  });

  const prompt = `Summarize these interviews:\n${convo}`;

  try {
    const summaryResponse = await axios.post(
      'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent',
      {
        contents: [{ role: 'user', parts: [{ text: prompt }] }]
      },
      {
        headers: { 'Content-Type': 'application/json' },
        params: { key: process.env.GEMINI_API_KEY },
      }
    );

    call.summary = summaryResponse.data.candidates?.[0]?.content?.parts?.[0]?.text || 'No summary.';
    await call.save();
    console.log("📋 Summary saved.");
  } catch (err) {
    console.error('❌ Summary error:', err.response?.data || err.message);
  }
}
app.listen(5000, () =>  console.log("🚀 Server running at http://localhost:5000"));