/**
 * Prompt for OTP matching with speech-to-text transcript
 * Used to compare a known OTP with a transcribed audio/video
 */
export const otpMatchPrompt = `Task: Determine whether the speech-to-text transcript contains the given OTP.

You are given:
- A reference OTP (ground truth digits) - This is a 6-digit OTP
- A speech-to-text transcript from automatic speech recognition (ASR)

Important: ASR systems may produce incorrect transcriptions due to similar-sounding words.
Examples of ASR transcription errors:
- "723" might be transcribed as "seven to three" (ASR error: "to" instead of "two")
- "456" might be transcribed as "for five six" (ASR error: "for" instead of "four")
- "180" might be transcribed as "one ate zero" (ASR error: "ate" instead of "eight")
- "309" might be transcribed as "three oh nine" (ASR error: "oh" instead of "zero")
- "1234" might be transcribed as "won too three for" (ASR errors: "won" instead of "one", "too" instead of "two", "for" instead of "four")
You must carefully analyze phonetically similar words and consider context when extracting OTP digits.

Your job is to analyze the transcript and determine:
1. Extract the OTP digits from the transcript (converting spoken words to digits, handling ASR errors)
2. Assess confidence in the match based on transcript clarity and ASR accuracy
3. Provide a clear, customer-friendly explanation of the result

Return JSON only.

Format:
{
  "extractedOtp": "string",
  "reason": "string",
  "confidence": number
}

Rules:
- extractedOtp:
  - Must be exactly 6 digits (no spaces, no letters)
  - The OTP is always 6 digits long
  - Convert similar-sounding words to digits:
    "one" = 1, "two" = 2, "three" = 3, "four" = 4, "five" = 5,
    "six" = 6, "seven" = 7, "eight" = 8, "nine" = 9, "zero" = 0
  - Handle variations: "oh" = 0, "to" = 2 (context-dependent)
  - Account for ASR transcription errors:
    - Phonetically similar words that might represent digits (e.g., "to" might be "two", "for" might be "four", "ate" might be "eight", "oh" might be "zero", "won" might be "one")
    - Consider context and surrounding words when determining if a word represents a digit
    - Be cautious with ambiguous transcriptions
  - If no OTP found in transcript or you are not sure, use "-1-1-1-1-1-1"
- confidence:
  - Must be a number between 0 and 1
  - 0 = low confidence (unclear/ambiguous/background noise/ASR errors)
  - 1 = high confidence (clear, unambiguous match, no ASR errors)
  - Consider factors:
    - Audio quality and clarity
    - How well transcript matches reference OTP
    - Presence of similar-sounding words or numbers
    - Ambiguity in the transcript
    - Potential ASR transcription errors (e.g., digits transcribed as words)
    - If transcript contains words that might be ASR errors for digits, lower confidence
  - If you are not sure or cannot determine confidence, use -1
- reason:
  - Write a clear, genuine, and customer-friendly explanation
  - The reason should be understandable by a real customer (not technical jargon)
  - IMPORTANT: The customer does NOT know about transcripts, ASR, or backend processing
  - Write as if you are analyzing their video/audio recording directly
  - Be honest and transparent about the result
  - Examples of good reasons:
    - "The OTP was clearly spoken in the video and matches correctly."
    - "The audio in the video was unclear, making it difficult to verify the OTP."
    - "The OTP could not be clearly heard in the video due to background noise."
    - "Unable to clearly hear the OTP in the video recording."
    - "The OTP was spoken but some digits were unclear in the audio."
  - Avoid technical terms like "transcript", "ASR errors", "phonetic analysis", "confidence threshold", "speech-to-text"
  - Focus on what the customer would understand: video/audio quality, clarity, whether the OTP was heard clearly
  - Write from the customer's perspective - they only know they submitted a video
  - If you are not sure or cannot provide a reason, use "Unable to verify the OTP from the video recording."
- Default values when not found/not sure:
  - If you cannot determine the OTP, are not sure, or the transcript is too ambiguous:
    - extractedOtp: "-1-1-1-1-1-1"
    - confidence: -1
    - reason: "Unable to verify the OTP from the video recording."

Reference OTP: "{otp}"
Transcript: "{transcript}"`;
