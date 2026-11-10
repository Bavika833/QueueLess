# QueueLess — Smart Campus Queue Management

QueueLess is a React + Express + MongoDB + Socket.IO campus queue prototype. Students can choose a service, request a digital token, watch their live position and wait estimate update, and receive an in-browser heads-up as their turn approaches. The demo counter advances the sample queue every 30 seconds.

## Run locally

1. Install Node.js 18 or newer and MongoDB (or leave `MONGO_URI` unset to keep tickets in memory).
2. Run `npm install`.
3. Copy `.env.example` to `.env` if you need to customize the database URL.
4. Run `npm run dev` and open the Vite URL shown in the terminal.
5. For a production build, run `npm run build` then `npm start`.

New tickets are saved in MongoDB when it is configured; otherwise they live in server memory and reset on restart. Add authenticated student accounts and a staff-controlled counter screen before a real campus deployment; sample queue counts and auto-advance are demonstration behavior.
