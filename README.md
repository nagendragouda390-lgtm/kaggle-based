# IPL Chase Predictor

Flask web app that serves an XGBoost model predicting the batting team's win
probability while chasing a target, given the live match state.

## Files
- `app.py` — Flask app + prediction logic (derives run-rate/wicket features from raw inputs)
- `model.pkl` — trained XGBClassifier (13 features, `binary:logistic`)
- `templates/index.html` — simple form UI
- `requirements.txt`, `Procfile` — deployment config for Render

## Run locally
```bash
pip install -r requirements.txt
python app.py
```
Visit http://localhost:5000

## Deploy — GitHub + Render

1. **Push to GitHub**
   ```bash
   cd ipl-chase-predictor
   git init
   git add .
   git commit -m "IPL chase predictor - initial commit"
   git branch -M main
   git remote add origin https://github.com/<your-username>/ipl-chase-predictor.git
   git push -u origin main
   ```

2. **Create the Render service**
   - Go to https://dashboard.render.com → **New** → **Web Service**
   - Connect your GitHub account and select the `ipl-chase-predictor` repo
   - Settings:
     - **Environment**: Python 3
     - **Build Command**: `pip install -r requirements.txt`
     - **Start Command**: `gunicorn app:app`
     - **Instance type**: Free is fine to start
   - Click **Create Web Service**

Render will build and deploy automatically. Every future `git push` to `main`
redeploys the app. Cold starts on the free tier take ~30–60s after idling.
