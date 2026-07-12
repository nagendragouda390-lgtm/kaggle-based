from flask import Flask, request, jsonify, render_template
import pickle
import pandas as pd
import os

app = Flask(__name__)

# ---- Load model once at startup ----
MODEL_PATH = os.path.join(os.path.dirname(__file__), "model.pkl")
with open(MODEL_PATH, "rb") as f:
    model = pickle.load(f)

# Feature order the model was trained on (do not change the order)
FEATURE_ORDER = [
    "team_batting", "team_bowling", "target", "curr_run", "curr_ball",
    "curr_wick", "cr", "rpw", "req_runs", "balls_left", "wick_left",
    "rr", "rrpw",
]

# Team name -> encoded id, taken from the training notebook
TEAM_CODES = {
    "Rajasthan Royals": 3, "Royal Challengers Bengaluru": 252, "GT": 615, "PBKS": 134, "SRH": 494,
    "DC": 129, "KKR": 6, "CSK": 1, "LSG": 614, "MI": 2,
}


def build_features(team_batting, team_bowling, target, curr_run, curr_ball, curr_wick):
    """Derive the engineered features the model expects from the raw match state."""
    balls_left = 120 - curr_ball
    wick_left = 10 - curr_wick
    req_runs = target - curr_run

    overs_done = curr_ball / 6 if curr_ball > 0 else 1e-6
    overs_left = balls_left / 6 if balls_left > 0 else 1e-6

    cr = curr_run / overs_done                      # current run rate
    rr = req_runs / overs_left if req_runs > 0 else 0  # required run rate
    rpw = curr_run / max(curr_wick, 1)               # runs scored per wicket lost
    rrpw = req_runs / max(wick_left, 1)              # required runs per wicket left

    return {
        "team_batting": team_batting,
        "team_bowling": team_bowling,
        "target": target,
        "curr_run": curr_run,
        "curr_ball": curr_ball,
        "curr_wick": curr_wick,
        "cr": cr,
        "rpw": rpw,
        "req_runs": req_runs,
        "balls_left": balls_left,
        "wick_left": wick_left,
        "rr": rr,
        "rrpw": rrpw,
    }


@app.route("/")
def home():
    return render_template("index.html", teams=sorted(TEAM_CODES.keys()))


@app.route("/predict", methods=["POST"])
def predict():
    try:
        data = request.get_json(force=True) if request.is_json else request.form

        team_batting = TEAM_CODES[data["team_batting"]]
        team_bowling = TEAM_CODES[data["team_bowling"]]
        target = int(data["target"])
        curr_run = int(data["curr_run"])
        curr_ball = int(data["curr_ball"])
        curr_wick = int(data["curr_wick"])

        features = build_features(
            team_batting, team_bowling, target, curr_run, curr_ball, curr_wick
        )
        X = pd.DataFrame([features], columns=FEATURE_ORDER)

        win_prob = float(model.predict_proba(X)[0][1])
        result = {
            "batting_team_win_probability": round(win_prob * 100, 2),
            "bowling_team_win_probability": round((1 - win_prob) * 100, 2),
        }
        return jsonify(result)

    except KeyError as e:
        return jsonify({"error": f"Missing or invalid field: {e}"}), 400
    except Exception as e:
        return jsonify({"error": str(e)}), 500


if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5000))
    app.run(host="0.0.0.0", port=port, debug=False)
