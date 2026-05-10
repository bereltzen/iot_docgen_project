import os
import logging
from google import genai
from google.genai import types
from dotenv import load_dotenv

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(levelname)s: %(message)s')

def generate_documentation(prompt_string: str, model_name: str = "gemini-2.0-flash") -> str:
    """
    Sends the constructed prompt to the Google Gemini API using the NEW google-genai SDK
    and returns the generated Markdown.
    """
    
    # 1. Load environment variables securely
    load_dotenv()
    api_key = os.getenv("GEMINI_API_KEY")
    
    if not api_key:
        logging.error("GEMINI_API_KEY not found. Please ensure it is set in the .env file.")
        return ""

    try:
        # 2. Initialize the NEW Gemini client
        logging.info(f"Initializing new Gemini client with model: {model_name}")
        client = genai.Client(api_key=api_key)
        
        # 3. Generate content with strict temperature
        logging.info("Sending prompt to Gemini API... (This may take a few seconds)")
        response = client.models.generate_content(
            model=model_name,
            contents=prompt_string,
            config=types.GenerateContentConfig(
                temperature=0.1, 
            )
        )
        
        # 4. Return the generated text safely
        if response.text:
            logging.info("Successfully generated documentation.")
            return response.text
        else:
            logging.warning("The API returned an empty response.")
            return ""

    except Exception as e:
        # Catch-all for API errors in the new SDK
        logging.error(f"An unexpected error occurred during API call: {e}")
        
    return ""

# ==========================================
# Execution block for testing Step 3 in isolation
# ==========================================
if __name__ == "__main__":
    mock_prompt = """
    You are a technical writer. 
    Output exactly this text and nothing else: "# API Connection Successful"
    """
    print("Testing API Client...\n")
    result = generate_documentation(mock_prompt)
    if result:
        print("\n=== API RESPONSE ===")
        print(result)
    else:
        print("\n=== API CALL FAILED ===")
        print("Check the logs above for details.")