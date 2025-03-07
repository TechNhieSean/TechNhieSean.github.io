#!/usr/bin/env python3
import re
import sys

def format_date(date_str):
    """Convert YYYY-MM-DD to MM/DD/YY."""
    year, month, day = date_str.split('-')
    return f"{month}/{day}/{year[2:]}"

def format_time_range(start, end):
    """Convert times like '8:00 AM' and '10:00 AM' into '8:00-10:00 am'.
       If both times share the same meridiem, show it once at the end.
    """
    time_pattern = r'(\d{1,2}:\d{2})\s*([AP]M)'
    m1 = re.match(time_pattern, start, re.IGNORECASE)
    m2 = re.match(time_pattern, end, re.IGNORECASE)
    if m1 and m2:
        time1 = m1.group(1)
        time2 = m2.group(1)
        ampm1 = m1.group(2).lower()
        ampm2 = m2.group(2).lower()
        if ampm1 == ampm2:
            return f"{time1}-{time2} {ampm1}"
        else:
            return f"{time1} {ampm1}-{time2} {ampm2}"
    return f"{start}-{end}"

def parse_tasks(text):
    """
    Parses the input text and returns a list of strings in the format:
    Window<TAB>ID<TAB>Date<TAB>District
    """
    # Regex explanation:
    #   - The ID is captured right after a dash.
    #   - The District is extracted from "District:" up to "City:".
    #   - The Appointment Start line is used to capture the date and times.
    pattern = re.compile(
        r'-\s*(\S+).*?District:\s*(.*?)\s*City:.*?Appointment Start:\s*'
        r'(\d{4}-\d{2}-\d{2})\s*'
        r'(\d{1,2}:\d{2}\s*[AP]M)\s*-\s*'
        r'(\d{4}-\d{2}-\d{2})\s*'
        r'(\d{1,2}:\d{2}\s*[AP]M)',
        re.DOTALL | re.IGNORECASE
    )

    output_lines = []
    for match in pattern.finditer(text):
        task_id = match.group(1).strip()
        district = match.group(2).strip()
        date_raw = match.group(3).strip()
        start_time = match.group(4).strip()
        # match.group(5) is the end date (assumed same as start date)
        end_time = match.group(6).strip()

        formatted_date = format_date(date_raw)
        time_window = format_time_range(start_time, end_time)
        # Build a tab-separated line: Window, ID, Date, District
        line = f"{time_window}\t{task_id}\t{formatted_date}\t{district}"
        output_lines.append(line)
    return output_lines

def main():
    if len(sys.argv) < 2:
        print("Usage: python parse_tasks.py input_file.txt")
        sys.exit(1)
    
    input_file = sys.argv[1]
    try:
        with open(input_file, 'r') as f:
            text = f.read()
    except IOError as e:
        print(f"Error reading file: {e}")
        sys.exit(1)
    
    parsed_lines = parse_tasks(text)
    if not parsed_lines:
        print("No tasks found. Please check the input format.")
        sys.exit(0)
    
    # Print each parsed line
    for line in parsed_lines:
        print(line)

if __name__ == '__main__':
    main()
