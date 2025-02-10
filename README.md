# UK IP Address Generator

A web application for generating random IP addresses from specified IP ranges.

## Features

- Drag and drop interface for uploading IP range files
- Generate multiple IP addresses across different ranges
- Dark mode support
- Automatic download of generated IP addresses
- User-friendly interface with clear instructions

## Data File Format

The application accepts JSON files with the following structure:

```json
{
  "data": [
    ["1.186.0.0", "1.186.255.255", "65,536"],
    ["2.16.34.0", "2.16.34.255", "256"],
    ["2.16.37.0", "2.16.37.255", "256"]
  ]
}
```

Each array in the "data" array must contain three elements:
1. Start IP address (string)
2. End IP address (string)
3. Number of IPs in range (string, can include commas)

## How to Use

1. Upload IP Ranges:
   - Drag and drop your JSON file onto the upload area
   - Or click the upload area to select a file
   - The file must follow the specified JSON format

2. Generate IP Addresses:
   - Enter the number of IP addresses you want to generate
   - Click the "Generate and Download IPs" button
   - A text file containing the generated IP addresses will be downloaded

## Technical Details

- The generator uses a random distribution algorithm to spread IP addresses across different ranges
- Duplicate IP addresses are automatically removed
- The output is a plain text file with one IP address per line
- IP addresses are validated to ensure they fall within the specified ranges

## Development

This application is built with:
- React
- TypeScript
- Tailwind CSS
- Zustand for state management
- React Dropzone for file uploads