"""Finds the name-free end of the Speech Accent Archive paragraph in each recording.

Every speaker reads the same paragraph. The game only plays its last two
sentences, which don't mention anyone by name:

    "We also need a small plastic snake and a big toy frog for the kids. She can
    scoop these things into three red bags, and we will go meet her Wednesday at
    the train station."

This uses Whisper word timestamps to find where "We also need" starts and where
"train station" ends. build-accent-clips.js runs it for speakers that don't
have start/end times yet and saves the results in clips/accent-speakers.json.

Usage: python3 find-passage.py <whisper model> <mp3 file>...
Prints one JSON object per line: {"file", "start", "end", "firstEnd"} or {"file", "error"}.
"firstEnd" is where the first of the two sentences ends, if Whisper heard "kids".
Requires openai-whisper (pip install openai-whisper) and ffmpeg.
"""
import json
import re
import sys

import whisper

PARAGRAPH = (
    "Please call Stella. Ask her to bring these things with her from the store: "
    "six spoons of fresh snow peas, five thick slabs of blue cheese, and maybe a "
    "snack for her brother Bob. We also need a small plastic snake and a big toy "
    "frog for the kids. She can scoop these things into three red bags, and we "
    "will go meet her Wednesday at the train station."
)
START_WORDS = ["we", "also", "need", "a", "small", "plastic", "snake"]


def normalize(word):
    return re.sub(r"[^a-z]", "", word.lower())


def find_passage(words):
    words = [(normalize(w["word"]), w["start"], w["end"]) for w in words]
    words = [w for w in words if w[0]]

    # The start is where the most words line up with "we also need a small plastic snake".
    best_index, best_score = None, 0
    for i in range(len(words)):
        score = sum(
            1
            for j, expected in enumerate(START_WORDS)
            if i + j < len(words) and words[i + j][0] == expected
        )
        if score > best_score:
            best_index, best_score = i, score
    if best_index is None or best_score < 3:
        raise ValueError(f'couldn\'t find "We also need" (best match {best_score}/7 words)')
    start = words[best_index][1]

    stations = [w for w in words[best_index:] if w[0] == "station"]
    end = stations[-1][2] if stations else words[-1][2]
    if end - start < 5:
        raise ValueError(f"passage too short ({end - start:.1f}s)")

    # End of the first sentence ("...for the kids."), used to keep slow speakers' clips short.
    kids = [w for w in words[best_index:] if w[0] in ("kids", "kid", "kits", "kiss", "keys") and w[2] < end]
    first_end = kids[0][2] if kids else None
    return start, end, first_end


def main():
    model_name, files = sys.argv[1], sys.argv[2:]
    model = whisper.load_model(model_name, device="cpu")
    for path in files:
        error = None
        # Try without a prompt first: giving Whisper the paragraph text helps with
        # heavy accents but sometimes makes it repeat the prompt instead of listening.
        for prompt in (None, PARAGRAPH):
            try:
                result = model.transcribe(
                    path,
                    language="en",
                    word_timestamps=True,
                    initial_prompt=prompt,
                    condition_on_previous_text=False,
                    fp16=False,
                )
                words = [w for segment in result["segments"] for w in segment.get("words", [])]
                start, end, first_end = find_passage(words)
                result = {"file": path, "start": round(start, 2), "end": round(end, 2)}
                if first_end is not None:
                    result["firstEnd"] = round(first_end, 2)
                print(json.dumps(result), flush=True)
                break
            except Exception as e:  # try the next prompt, then report and move on
                error = str(e)
        else:
            print(json.dumps({"file": path, "error": error}), flush=True)


if __name__ == "__main__":
    main()
