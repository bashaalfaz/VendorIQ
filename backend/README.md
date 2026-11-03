## Backend setup
1. Create and activate a virtual environment.
2. `pip install -r requirements.txt`
3. Copy `.env.example` to `.env`; optionally add a Gemini API key.
4. Run from this folder: `uvicorn app.main:app --reload`
5. API docs: http://127.0.0.1:8000/docs

This is a demonstration MVP. Tax IDs are format-checked, not verified against government registries. Do not use real sensitive banking data.
