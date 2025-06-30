# 🏕️ Summer Camp Planner

Coordinate 2025 summer camp schedules with friends — easily and visually.

Built for parents who want to plan their children's summer together, this app lets you create a schedule, invite others, and see who’s attending which camp week by week.

---

## ✨ Features

- ✅ Create & join shared plans with unique plan IDs
- 👧 Add kids and assign them to camps by week
- 🗓️ Visual schedule grid showing who’s going where
- 🖨️ Printable summaries for each child (with friend highlights!)
- 🔄 Real-time collaboration powered by Firebase
- 📱 Fully responsive and mobile-friendly

---

## 🧱 Tech Stack

- **React** + **Vite** for the frontend
- **Tailwind CSS** for styling
- **Firebase Auth** (anonymous sign-in)
- **Cloud Firestore** for real-time data
- **Lucide-react** icons

---

🔧 Local Setup & Installation
To run this project on your local machine:

 Local Setup & Installation

Follow these steps to get the Summer Camp Planner project running on your local machine for development.

### **Prerequisites**
* [Node.js](https://nodejs.org/) (which includes npm) installed on your computer.
* A code editor like [Visual Studio Code](https://code.visualstudio.com/).
* A Firebase project with Firestore and Anonymous Authentication enabled.

---

### **Step 1: Create the React Project**

1.  Open your terminal or command prompt.
2.  Navigate to the directory where you want to store your project (e.g., `cd Documents/Projects`).
3.  Run the Vite command to create a new React project.

    ```bash
    npm create vite@latest camp-planner -- --template react
    ```

### **Step 2: Install Dependencies**

1.  Navigate into your new project directory.

    ```bash
    cd camp-planner
    ```
2.  Install the required libraries for the project (Firebase, Lucide icons, and Tailwind CSS).

    ```bash
    npm install firebase lucide-react
    npm install -D tailwindcss postcss autoprefixer
    ```

### **Step 3: Configure Tailwind CSS**

1.  Run the Tailwind init command to generate configuration files.

    ```bash
    npx tailwindcss init -p
    ```
2.  Open the generated `tailwind.config.js` file and replace its content with the following to configure it to scan your source files.

    ```javascript
    /** @type {import('tailwindcss').Config} */
    export default {
      content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
      ],
      theme: {
        extend: {},
      },
      plugins: [],
    }
    ```
3.  Open the `src/index.css` file, delete any existing content, and add the three Tailwind directives.

    ```css
    @tailwind base;
    @tailwind components;
    @tailwind utilities;
    ```

### **Step 4: Set Up Environment Variables**

1.  In the root of your `camp-planner` folder, create a new file named exactly `.env.local`.
2.  Add your Firebase configuration to this file as a single-line JSON string. **Replace the placeholder values with your actual Firebase project keys.**

    ```
    VITE_FIREBASE_CONFIG='{"apiKey":"AIza...","authDomain":"...","projectId":"...","storageBucket":"...","messagingSenderId":"...","appId":"..."}'
    VITE_APP_ID='default-summer-camp-planner'
    ```

### **Step 5: Add the Application Code**

1.  Open the `src/App.jsx` file in your code editor.
2.  Delete all the default content inside it.
3.  Copy the full code for the Camp Planner application and paste it into the now-empty `src/App.jsx` file.
4.  Make sure the Firebase configuration block at the top of `src/App.jsx` is the version that reads from `import.meta.env`.

### **Step 6: Run the Development Server**

1.  You're all set! Run the following command in your terminal to start the app.

    ```bash
    npm run dev
    ```
2.  Open your web browser and navigate to the local URL provided (usually `http://localhost:5173`). You should see the fully functional and styled application.

