# SchemeMatch — Government Scheme Finder

**The Right Scheme for the Right Person at the Right Time.**

SchemeMatch is a web-based project designed to help users discover government-scheme opportunities that may match their personal profile and eligibility criteria. By considering details such as age, annual family income, occupation, and state, the platform aims to make scheme discovery simpler and more accessible.

## 🎯 Problem Statement

Many people are unaware of government schemes that may be relevant to them. Finding scheme information and understanding eligibility requirements can be confusing and time-consuming.

SchemeMatch aims to address this challenge by providing a simple interface where users can enter their details and explore potentially relevant schemes.

## 💡 Our Solution

SchemeMatch is designed to:
- Collect relevant user information through a simple web interface.
- Compare user details with scheme eligibility criteria.
- Display potentially matching schemes and their benefits.
- Present eligibility information in an easy-to-understand format.
- Make scheme discovery more convenient and user-friendly.

## ✨ Key Features

- **User-Friendly Interface:** A simple and accessible website design.
- **Profile-Based Matching:** Uses user details to evaluate scheme eligibility criteria.
- **Eligibility Analysis:** Helps identify criteria that match or do not match the provided profile.
- **Scheme Database:** Stores scheme information in a structured JSON file.
- **Python Backend:** Uses Flask to serve scheme data through an API.
- **Responsive Design Goal:** Designed with usability across different screen sizes in mind.

## 🛠️ Tech Stack

| Technology | Purpose |
|---|---|
| HTML5 | Website structure |
| CSS3 | Styling and layout |
| JavaScript | User interactions and frontend logic |
| Python | Backend programming |
| Flask | Backend web framework and API |
| JSON | Structured scheme data storage |
| Git & GitHub | Version control and project hosting |

## 📂 Project Structure

```text
SchemeMatch/
├── index.html
├── style.css
├── script.js
├── app.py
└── database/
    └── schemes.json
```

## ⚙️ How It Works

1. The user enters the requested profile information.
2. The application evaluates the profile against the available scheme criteria.
3. Scheme data is stored in `database/schemes.json`.
4. The Flask backend provides scheme data through the `/api/schemes` endpoint.
5. The frontend can display relevant results based on the matching logic.

## 🚀 Getting Started

### Prerequisites

- Python 3.13 or another compatible Python version
- Visual Studio Code or another code editor
- A modern web browser

### Installation

**1. Clone the repository**

```bash
git clone <YOUR_GITHUB_REPOSITORY_URL>
```

**2. Open the project folder**

```bash
cd SchemeMatch
```

**3. Install Flask**

```bash
python -m pip install flask
```

**4. Start the backend**

```bash
python app.py
```

**5. Open the API endpoint**

Visit the following address in your browser:

```text
http://127.0.0.1:5000/api/schemes
```

The endpoint should return the scheme data in JSON format when the backend is running correctly.

Open `index.html` in a browser to view the frontend. Full frontend-backend integration is required for the website to use the live API data.

## 🧪 Current Prototype Status

SchemeMatch is a hackathon prototype under development.

- The frontend provides the website interface.
- The JSON database contains fictional sample scheme records for demonstration and testing.
- The Flask backend is being developed to serve the scheme database.
- Frontend integration with the backend is a work in progress.

**Important:** The current dataset contains fictional demo schemes, eligibility criteria, and benefit amounts. It does not represent verified Indian government schemes and must not be used to make real eligibility or benefit decisions.

## 🔮 Future Scope

- Integrate verified scheme information from authoritative government sources.
- Add regular data verification and update mechanisms.
- Improve eligibility matching and explain why a user may or may not qualify.
- Add multilingual support for greater accessibility.
- Provide official application links and document checklists.
- Improve accessibility and mobile responsiveness.
- Expand the database and support more user profiles and scheme categories.

## 👥 Team

**Team Name:** Impact X

**Event:** INNOHACKS 2.0

## 📌 Disclaimer

SchemeMatch is an educational prototype developed for demonstration purposes. Its current fictional dataset is intended only for testing the application's functionality. Users should consult official government sources to verify actual schemes, eligibility requirements, benefits, and application procedures.

---

*Built with the goal of making scheme discovery simpler, clearer, and more accessible.*
