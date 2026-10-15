from flask import Flask, jsonify
from flask_cors import CORS
import json
from pathlib import Path

app = Flask(__name__)

# Allow the local frontend to communicate with Flask.
# Restrict access to the Live Server origin used by this project.
CORS(
    app,
    resources={
        r"/api/*": {
            "origins": ["http://127.0.0.1:5500"]
        }
    }
)

# Locate the project folders.
BASE_DIR = Path(__file__).resolve().parent
DATABASE_PATH = BASE_DIR.parent / "database" / "schemes.json"


# Load fictional demonstration schemes from the JSON file.
def load_schemes():
    with open(DATABASE_PATH, "r", encoding="utf-8") as file:
        return json.load(file)


# API endpoint: return all schemes.
@app.route("/api/schemes", methods=["GET"])
def get_schemes():
    try:
        schemes = load_schemes()

        # Support a JSON list or an object containing a schemes list.
        if isinstance(schemes, dict):
            schemes = schemes.get("schemes", [])

        if not isinstance(schemes, list):
            return jsonify({
                "error": "The scheme database must contain a list."
            }), 500

        return jsonify({
            "total": len(schemes),
            "schemes": schemes
        })

    except FileNotFoundError:
        return jsonify({
            "error": "Schemes database file was not found."
        }), 500

    except json.JSONDecodeError:
        return jsonify({
            "error": "The schemes.json file contains invalid JSON."
        }), 500

    except OSError:
        return jsonify({
            "error": "The scheme database could not be read."
        }), 500


# Start the local development server.
if __name__ == "__main__":
    app.run(debug=True, port=5000)