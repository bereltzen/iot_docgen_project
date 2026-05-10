import os
import logging
from pathlib import Path
from typing import Dict, Union

# Configure basic logging for visibility
logging.basicConfig(level=logging.INFO, format='%(levelname)s: %(message)s')

def read_device_inputs(folder_path: Union[str, Path]) -> Dict[str, str]:
    """
    Reads all text-based files from the specified directory to extract raw IoT data.

    Args:
        folder_path (Union[str, Path]): The path to the directory containing input files.

    Returns:
        Dict[str, str]: A dictionary where keys are filenames and values are file contents.
    """
    target_dir = Path(folder_path)
    raw_data_dict: Dict[str, str] = {}

    # Gracefully handle missing directories
    if not target_dir.exists():
        logging.error(f"Directory not found: {target_dir.resolve()}")
        return raw_data_dict

    if not target_dir.is_dir():
        logging.error(f"Path is not a directory: {target_dir.resolve()}")
        return raw_data_dict

    # Iterate through files in the directory
    for file_path in target_dir.iterdir():
        if file_path.is_file():
            try:
                # Attempt to read the file as UTF-8
                with open(file_path, 'r', encoding='utf-8') as f:
                    content = f.read().strip()
                    if content:
                        raw_data_dict[file_path.name] = content
                        logging.info(f"Successfully read: {file_path.name}")
                    else:
                        logging.warning(f"File is empty, skipping: {file_path.name}")
            
            except UnicodeDecodeError:
                # Gracefully skip binaries (e.g., .pyc, .bin files) or non-UTF-8 files
                logging.warning(f"Skipping binary or non-UTF-8 file: {file_path.name}")
            except Exception as e:
                # Catch permission errors or other unexpected I/O issues
                logging.error(f"Error reading file {file_path.name}: {e}")

    return raw_data_dict

def format_inputs_for_prompt(raw_data_dict: Dict[str, str]) -> str:
    """
    Normalizes the extracted dictionary into a single formatted string
    ready to be injected into an LLM prompt.

    Args:
        raw_data_dict (Dict[str, str]): Dictionary mapping filenames to contents.

    Returns:
        str: A consolidated string with clear delimiters for each file.
    """
    if not raw_data_dict:
        return "No raw data provided."

    formatted_sections = []
    
    for filename, content in raw_data_dict.items():
        # Using explicit file wrappers helps the LLM distinguish between code, JSON, and notes
        section = f"--- BEGIN FILE: {filename} ---\n{content}\n--- END FILE: {filename} ---\n"
        formatted_sections.append(section)

    return "\n".join(formatted_sections)

# ==========================================
# Execution block for testing Step 1 in isolation
# ==========================================
if __name__ == "__main__":
    test_folder = "mock_data"
    print(f"Testing input reader on folder: '{test_folder}'...\n")
    
    # 1. Read the files into memory safely
    data_dict = read_device_inputs(test_folder)
    
    # 2. Normalize the output for the future Prompt Builder
    formatted_string = format_inputs_for_prompt(data_dict)
    
    print("\n=== NORMALIZED STRING READY FOR PROMPT BUILDER ===")
    print(formatted_string)