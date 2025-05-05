## 📞 AI-Powered Voice Call System using AI

This project is a smart conversational calling platform built using the Node.js Environment, integrated with Twilio for programmable voice calling and AI for real-time, human-like conversations. The system allows you to send prompts (questions) and phone numbers, and the application automatically makes a call to the user, interacts naturally, gathers responses, and generates detailed reports. 

## 🚀 Features

- ✅ Make outbound voice calls to mobile numbers
- 🤖 Conduct interactive voice conversations powered by AI
- 🧠 Talk like a human — from greeting to goodbye
- 🗣️ Convert text to speech (TTS) and speech to text (STT)
- 📊 Store responses in MongoDB and generate structured reports
- 🌐 Easy-to-use React frontend for entering phone numbers and prompts
- 🔐 Full compliance with Indian telecom regulations (TRAI & DND)

## Backend Setup

Create a `.env` file in `/backend`

### env

TWILIO_SID=YOUR_SID_KEY
TWILIO_AUTH=YOUR_AUTH_KEY
TWILIO_PHONE=YOUR_PHONE_NUMBER
MONGO_URI=YOUR_MONGODB_URL
GEMINI_API_KEY=YOUR_GEMINI_API_KEY
BASE_URL=YOUR_BASE_URL
GROQ_API_KEY=YOUR_GROQ_API_KEY

## Install dependencies:

cd backend
npm install

### Start server:

node index.js or nodemon index.js

## 📞 How It Works

1. Admin inputs a phone number and a prompt/question from the frontend.
2. The backend sends a call requests.
3. The call is initiated, and AI processes the user's speech, replies in human-like voice using TTS.
4. The full conversation is transcribed, stored, and reported.

## 📊 Report Generation

- Every call’s transcript is stored in MongoDB.
- Reports are generated automatically with question/answer pairs.
- Future versions will support PDF/Excel report export.

## ⚖️ Legal and Compliance

- Ensure all calls comply with **TRAI regulations**.
- Validate numbers against **DND lists**.
- Store user consent and data securely.

## 🧠 Future Enhancements

- Add PDF export for call summaries
- Add call history and scheduling
- Integrate multi-language voice support
- Real-time dashboard and analytics

## 🤝 Contributions

Pull requests are welcome! For major changes, please open an issue first to discuss what you would like to change.

## 📧 Contact

**Developer**: SAHIL SAINI  
**Email**: sahilsaini22001@gmail.com
**LinkedIn**: www.linkedin.com/in/codersahil

## 📜 License

MIT License © SAHIL SAINI