import os

# Collection of formats that are read by the script.
format_list = [
    "js",
    "html",
    "css"
]

def collect_files(input_folder):
    """Recursively collects all .extension file paths from the given folder for every extension in format_list."""
    collected_files = []
    for root, _, filenames in os.walk(input_folder):
        for file in filenames:
            if file.lower().endswith(tuple(format_list)):
                collected_files.append(os.path.join(root, file))
    return collected_files

def count_words(text):
    """Counts the words in a given text string."""
    return len(text.split())

def write_batch(output_folder, batch_num, file_entries):
    """Writes the current batch of file entries to an output file.
    
    The naming convention is as follows:
      - First batch: output.txt
      - Subsequent batches: output_02.txt, output_03.txt, ...
    
    Output format:
    === filename.ext ===\nCONTENTS\n
    """
    # Determine file name based on batch number.
    if batch_num == 1:
        output_filename = "output.txt"
    else:
        output_filename = f"output_{batch_num:02d}.txt"
    output_path = os.path.join(output_folder, output_filename)
    
    with open(output_path, 'w', encoding='utf-8') as f_out:
        # Write each file's name and content in the batch.
        for file_name, content in file_entries:
            f_out.write(f"=== {file_name} ===\n")
            f_out.write(content)
            f_out.write("\n\n")
    print(f"Batch {batch_num} written to {output_path}")

def main():
    # Step 0: Show user the current format list and allow to continue or abort
    print("Current file extensions to search:", ', '.join(format_list))
    proceed = input("Press Enter to continue with these, or Ctrl+C to abort...")

    # Step 1: Ask user for input folder, default is root folder
    default_input_folder = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
    input_folder = input(f"Enter the path to the input folder containing files to be read (default: {default_input_folder}): ").strip()
    if not input_folder:
        input_folder = default_input_folder
    if not os.path.isdir(input_folder):
        print("Invalid input folder. Exiting.")
        return

    # Step 2: Ask user for max tokens per file (default: infinite)
    max_tokens_input = input("Enter the maximum number of tokens (words) allowed per file (default: infinite): ").strip()
    if max_tokens_input:
        try:
            max_tokens = int(max_tokens_input)
        except ValueError:
            print("Invalid number, using infinite.")
            max_tokens = float('inf')
    else:
        max_tokens = float('inf')

    # Step 3: Ask user if every file should create a new output file (default: no)
    one_file_per_output = input("Should every file create a new output file? (y/N) (default:No): ").strip().lower() == 'y'

    files = collect_files(input_folder)
    if not files:
        print("No files found in the provided folder that matches the specified formats.")
        return
    print(f"Found {len(files)} file(s).")

    # Step 4: Compute word counts for every file while reading their content.
    file_contents = []
    skipped_files = 0
    for file_path in files:
        try:
            with open(file_path, 'r', encoding='utf-8') as f:
                content = f.read()
            words = count_words(content)
            if words > max_tokens:
                print(f"Skipping {file_path} (contains {words} words, which exceeds the per-file limit of {max_tokens}).")
                skipped_files += 1
                continue
            file_contents.append((os.path.basename(file_path), content, words))
        except Exception as e:
            print(f"Error reading {file_path}: {e}")
    print(f"Total files to process: {len(file_contents)} (skipped {skipped_files} file(s) due to length).")

    # Step 5: Ask user for output folder, default is 'out' in the root folder
    default_output_folder = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', 'out'))
    output_folder = input(f"Enter the path to the output folder for the text files (default: {default_output_folder}): ").strip()
    if not output_folder:
        output_folder = default_output_folder
    if not os.path.isdir(output_folder):
        try:
            os.makedirs(output_folder)
            print(f"Created output folder: {output_folder}")
        except Exception as e:
            print(f"Error creating output folder: {e}")
            return

    # Step 6: Write output files according to user preferences
    batch = []
    batch_word_count = 0
    batch_num = 1
    for file_name, content, file_word_count in file_contents:
        entry = (file_name, content)
        if one_file_per_output:
            write_batch(output_folder, batch_num, [entry])
            batch_num += 1
            continue
        # If adding this file would exceed the token limit, write out the current batch and start a new one
        if batch_word_count + file_word_count > max_tokens and batch:
            write_batch(output_folder, batch_num, batch)
            batch_num += 1
            batch = []
            batch_word_count = 0
        # If the file itself is larger than the token limit, still put it in its own batch
        if file_word_count > max_tokens:
            write_batch(output_folder, batch_num, [entry])
            batch_num += 1
            continue
        batch.append(entry)
        batch_word_count += file_word_count
    # Write any remaining files in the current batch
    if batch and not one_file_per_output:
        write_batch(output_folder, batch_num, batch)

if __name__ == "__main__":
    main()
