from dotenv import load_dotenv
from anthropic import Anthropic
from flask import Flask, render_template, request, session, jsonify
import os
from datetime import datetime

load_dotenv()

app = Flask(__name__)
app.secret_key = os.environ.get("FLASK_SECRET_KEY", os.urandom(24))
client = Anthropic(api_key=os.environ.get("ANTHROPIC_API_KEY"))

# Pricing per million tokens (input, output)
MODELS = {
    "claude-opus-4-8": {
        "label": "Claude Opus 4.8",
        "input_per_m":  15.00,
        "output_per_m": 25.00,
        "max_tokens": 128000,
    },
    "claude-sonnet-4-6": {
        "label": "Claude Sonnet 4.6",
        "input_per_m":   3.00,
        "output_per_m": 15.00,
        "max_tokens": 64000,
    },
    "claude-haiku-4-5": {
        "label": "Claude Haiku 4.5",
        "input_per_m":  1.00,
        "output_per_m": 5.00,
        "max_tokens": 64000,
    },
}
DEFAULT_MODEL = "claude-sonnet-4-6"
DEFAULT_MAX_TOKENS = 1024

def calculate_cost(model_id, input_tokens, output_tokens):
    pricing = MODELS.get(model_id, MODELS[DEFAULT_MODEL])
    cost = (input_tokens * pricing["input_per_m"] / 1_000_000
          + output_tokens * pricing["output_per_m"] / 1_000_000)
    return round(cost, 6)

@app.context_processor
def inject_globals():
    return {"now": datetime.utcnow(), "models": MODELS, "default_model": DEFAULT_MODEL}

@app.route("/")
def index():
    if "messages" not in session:
        session["messages"] = []
    return render_template("index.html", messages=session["messages"])

@app.route("/api/chat", methods=["POST"])
def api_chat():
    if "messages" not in session:
        session["messages"] = []

    data = request.get_json(silent=True) or {}
    user_message = data.get("message", "").strip()
    model_id = data.get("model", DEFAULT_MODEL)
    if model_id not in MODELS:
        return jsonify({"error": f"Unknown model: {model_id}"}), 400
    if not user_message:
        return jsonify({"error": "No message provided"}), 400

    # Validate max_tokens
    max_tokens_raw = data.get("max_tokens")
    if max_tokens_raw is None:
        max_tokens = DEFAULT_MAX_TOKENS
    else:
        if not isinstance(max_tokens_raw, int) or isinstance(max_tokens_raw, bool):
            return jsonify({"error": "max_tokens must be a positive integer."}), 400
        if max_tokens_raw <= 0:
            return jsonify({"error": "max_tokens must be a positive integer."}), 400
        ceiling = MODELS[model_id]["max_tokens"]
        if max_tokens_raw > ceiling:
            return jsonify({"error": f"max_tokens exceeds the limit for model {model_id} (max: {ceiling})."}), 400
        max_tokens = max_tokens_raw

    session["messages"].append({"role": "user", "content": user_message})

    try:
        result = client.messages.create(
            model=model_id,
            max_tokens=max_tokens,
            messages=session["messages"]
        )
    except Exception as e:
        session["messages"].pop()  # remove the user message we just added
        return jsonify({"error": str(e)}), 502

    assistant_reply = result.content[0].text
    session["messages"].append({"role": "assistant", "content": assistant_reply})
    session.modified = True

    input_tokens  = result.usage.input_tokens
    output_tokens = result.usage.output_tokens
    cost = calculate_cost(model_id, input_tokens, output_tokens)

    return jsonify({
        "reply": assistant_reply,
        "model": MODELS[model_id]["label"],
        "input_tokens": input_tokens,
        "output_tokens": output_tokens,
        "cost_usd": cost,
    })

@app.route("/api/clear", methods=["POST"])
def api_clear():
    session["messages"] = []
    return jsonify({"ok": True})

if __name__ == "__main__":
    app.run(debug=True)
