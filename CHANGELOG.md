# Changelog

All notable changes to this project will be documented in this file.

## [1.2.0] - 2025-01-27

### Added
- **MaxMind GeoLite2 Format Support**: Added comprehensive support for MaxMind GeoLite2 database format
  - Support for `GeoLite2-Country-Locations-en.csv` file containing geographic location data
  - Support for `GeoLite2-Country-Blocks-IPv4.csv` file containing IP network blocks
  - Automatic joining of location and block data using geoname_id relationships
- **CIDR Notation Processing**: Automatic conversion from CIDR notation (e.g., 1.186.0.0/17) to IP ranges
- **Multi-File Upload**: Enhanced file upload to handle multiple files simultaneously for MaxMind format
- **Advanced CSV Parsing**: Improved CSV parsing to handle quoted fields and complex data structures
- **Geographic Data Integration**: Seamless integration of geographic metadata with IP ranges

### Enhanced
- **File Type Detection**: Intelligent detection of MaxMind format files based on filename patterns
- **Upload Status Feedback**: Enhanced status messages showing which MaxMind files are uploaded and missing
- **Country Selection**: Extended country filtering to work with MaxMind's comprehensive geographic database
- **Error Handling**: Improved error handling for complex multi-file uploads and data processing

### Technical Improvements
- **Data Structure Optimization**: Enhanced data structures to handle MaxMind's geoname_id relationships
- **Memory Efficiency**: Optimized processing of large MaxMind database files
- **Type Safety**: Added comprehensive TypeScript interfaces for MaxMind data structures
- **Parsing Robustness**: Improved CSV parsing to handle various quote and delimiter scenarios

## [1.1.0] - 2025-01-27

### Added
- **CSV File Format Support**: Added support for uploading CSV files containing IP ranges with country information
- **Country Filtering**: When using CSV files, users can now select specific countries from a dropdown to filter IP ranges
- **Long Integer to IP Conversion**: Automatic conversion from 32-bit long integers to standard dotted decimal IP format
- **Enhanced File Detection**: Application now automatically detects and handles both JSON and CSV file formats
- **Country-Specific Downloads**: Generated IP files are automatically named based on the selected country (e.g., `generated_ips_au.txt`)

### Enhanced
- **Improved Instructions**: Updated help documentation to include detailed information about both JSON and CSV file formats
- **Better User Feedback**: Enhanced status messages to clearly indicate file type, loaded ranges, and country selection status
- **Responsive Country Selection**: Dynamic dropdown population based on countries available in the uploaded CSV file

### Technical Improvements
- **Type Safety**: Added proper TypeScript interfaces for CSV data handling
- **Error Handling**: Improved file parsing with better error messages for invalid formats
- **Memory Efficiency**: Optimized handling of large CSV files with country-based filtering

## [1.0.0] - 2025-01-27

### Initial Release
- **Core Functionality**: IP address generation from JSON-formatted IP ranges
- **Modern UI**: Clean, responsive interface with dark/light theme support
- **File Upload**: Drag-and-drop file upload with visual feedback
- **Customizable Generation**: User-configurable number of IP addresses to generate
- **Duplicate Prevention**: Automatic removal of duplicate IP addresses
- **Download Feature**: One-click download of generated IP addresses as text file
- **Welcome Modal**: Dismissible welcome modal with instructions
- **Theme Support**: Light, dark, and system theme options
- **Responsive Design**: Mobile-friendly interface
- **Settings Menu**: Burger menu with help, share, and privacy policy options