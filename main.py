import argparse
import logging
import os
import sys
from dotenv import load_dotenv

# Import our custom modules
from input_reader import read_device_inputs, format_inputs_for_prompt
from prompt_builder import build_documentation_prompt
from llm_client import generate_documentation
from output_writer import save_markdown_to_file

# Configure logging for the main orchestrator
logging.basicConfig(level=logging.INFO, format='%(message)s')

def main():
    # 1. Setup CLI Arguments
    parser = argparse.ArgumentParser(
        description="IoT-DocGen: Automated API Documentation Generator for IoT Devices",
        formatter_class=argparse.ArgumentDefaultsHelpFormatter
    )
    parser.add_argument(
        "--input", 
        type=str, 
        default="./mock_data", 
        help="Path to the directory containing raw IoT device files."
    )
    parser.add_argument(
        "--output", 
        type=str, 
        default="./docs/device_api.md", 
        help="Path and filename for the generated Markdown documentation."
    )
    args = parser.parse_args()

    print("==================================================")
    print("[*] Starting IoT-DocGen Pipeline")
    print("==================================================")

    # 2. Read and Format Inputs
    print(f"[*] Step 1: Reading inputs from '{args.input}'...")
    raw_data_dict = read_device_inputs(args.input)
    
    if not raw_data_dict:
        logging.error("[!] No data found or error reading directory. Aborting.")
        sys.exit(1)
        
    normalized_context = format_inputs_for_prompt(raw_data_dict)
    print(f"    -> Successfully loaded {len(raw_data_dict)} file(s).")

    # 3. Build the Prompt
    print("[*] Step 2: Constructing LLM prompt architecture...")
    final_prompt = build_documentation_prompt(normalized_context)
    print("    -> Prompt built successfully.\n")

    # Check for GEMINI_API_KEY in .env
    load_dotenv()
    api_key = os.getenv("GEMINI_API_KEY")
    is_valid_key = api_key and api_key.strip() != "" and "Your API KEY" not in api_key

    if is_valid_key:
        # 4. Generate Documentation via API
        print("[*] Step 3: Sending payload to Google Gemini API (gemini-2.0-flash)...")
        generated_markdown = generate_documentation(final_prompt)
        
        if not generated_markdown:
            logging.error("[!] Failed to generate documentation from the API. Aborting.")
            sys.exit(1)
        print("    -> Documentation generated successfully.")

        # 5. Save Output
        print(f"[*] Step 4: Saving output to '{args.output}'...")
        success = save_markdown_to_file(generated_markdown, args.output)
        
        if success:
            print("==================================================")
            print(f"[SUCCESS] Pipeline Complete! Your docs are ready at: {args.output}")
            print("==================================================")
        else:
            logging.error("[!] Pipeline failed during file saving.")
            sys.exit(1)
    else:
        print("[HINT] Set GEMINI_API_KEY in your .env file to automate documentation generation via the API.")
        print("=== MÁSOLD KI EZT A PROMPTOT / COPY THIS PROMPT ===")
        print(final_prompt)
        print("===================================================\n")

if __name__ == "__main__":
    main()