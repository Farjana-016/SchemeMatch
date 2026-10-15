
from flask import Flask, jsonify
from flask_cors import CORS
import json
from pathlib import Path

app = Flask(__name__)

# Allow requests from the deployed frontend and local development frontend.
CORS(
    app,
    resources={
        r"/api/*": {
            "origins": [
                "https://schemematch-woad.vercel.app",
                "http://127.0.0.1:5500",
                "http://localhost:5500",
                "http://127.0.0.1:5501",
                "http://localhost:5501"
            ]
        }
    }
)

# Locate the scheme database.
BASE_DIR = Path(__file__).resolve().parent
DATABASE_PATH = BASE_DIR.parent / "database" / "schemes.json"


def load_schemes():
    with open(DATABASE_PATH, "r", encoding="utf-8") as file:
        return json.load(file)


# Test whether the backend is running.
@app.route("/", methods=["GET"])
def home():
    return jsonify({
        "status": "success",
        "message": "SchemeMatch backend is running."
    })


# Return all demonstration schemes.
@app.route("/api/schemes", methods=["GET"])
def get_schemes():
    try:
        data = load_schemes()

        if isinstance(data, dict):
            data = data.get("schemes", [])

        if not isinstance(data, list):
            return jsonify({
                "error": "The scheme database must contain a list."
            }), 500

        return jsonify({
            "total": len(data),
            "schemes": data
        })

    except FileNotFoundError:
        return jsonify({
            "error": "Schemes database file was not found.",
            "expected_path": str(DATABASE_PATH)
        }), 500

    except json.JSONDecodeError:
        return jsonify({
            "error": "The schemes.json file contains invalid JSON."
        }), 500

    except OSError:
        app.logger.exception("Could not read the scheme database.")
        return jsonify({
            "error": "The scheme database could not be read."
        }), 500


if __name__ == "__main__":
    app.run(debug=True, port=5000)
