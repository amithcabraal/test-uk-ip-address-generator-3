import { type FC } from 'react';

export const Instructions: FC = () => {
  return (
    <div className="max-w-2xl mx-auto mb-8 p-6 bg-white dark:bg-gray-800 rounded-lg shadow-md">
      <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">Instructions</h2>
      
      <div className="space-y-6">
        <section>
          <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200 mb-2">Supported File Formats</h3>
          <p className="text-gray-600 dark:text-gray-300 mb-4">
            The application accepts two file formats:
          </p>
          
          <div className="space-y-4">
            <div>
              <h4 className="font-medium text-gray-800 dark:text-gray-200 mb-2">1. JSON Format</h4>
              <pre className="bg-gray-100 dark:bg-gray-700 p-4 rounded-md overflow-x-auto text-gray-800 dark:text-gray-100 text-sm">
{`{
  "data": [
    ["1.186.0.0", "1.186.255.255", "65,536"],
    ["2.16.34.0", "2.16.34.255", "256"]
  ]
}`}
              </pre>
              <p className="text-gray-600 dark:text-gray-300 mt-2 text-sm">
                Each array contains: Start IP, End IP, Number of IPs (as string with optional commas)
              </p>
            </div>

            <div>
              <h4 className="font-medium text-gray-800 dark:text-gray-200 mb-2">2. CSV Format (with Country Filtering)</h4>
              <pre className="bg-gray-100 dark:bg-gray-700 p-4 rounded-md overflow-x-auto text-gray-800 dark:text-gray-100 text-sm">
{`"16777216","16777471","AU","Australia"
"16777472","16778239","CN","China"
"16778240","16779263","AU","Australia"`}
              </pre>
              <p className="text-gray-600 dark:text-gray-300 mt-2 text-sm">
                Each line contains: Start IP (as long), End IP (as long), Country Code, Country Name
              </p>
            </div>
          </div>
        </section>

        <section>
          <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200 mb-2">How to Use</h3>
          <ol className="list-decimal list-inside text-gray-600 dark:text-gray-300 space-y-2">
            <li>Drag and drop your JSON or CSV file containing IP ranges onto the upload area, or click to select a file</li>
            <li><strong>For CSV files:</strong> Select a country from the dropdown menu to filter IP ranges</li>
            <li>Enter the number of IP addresses you want to generate</li>
            <li>Click the "Generate and Download IPs" button</li>
            <li>A text file containing the generated IP addresses will be downloaded automatically</li>
          </ol>
        </section>

        <section>
          <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200 mb-2">Features</h3>
          <ul className="list-disc list-inside text-gray-600 dark:text-gray-300 space-y-1">
            <li><strong>Country Filtering:</strong> CSV files allow you to generate IPs from specific countries</li>
            <li><strong>Smart Distribution:</strong> IP addresses are distributed across different ranges</li>
            <li><strong>Random Generation:</strong> Each IP address is randomly generated within the specified ranges</li>
            <li><strong>Duplicate Removal:</strong> Duplicate IP addresses are automatically removed</li>
            <li><strong>Octet Format:</strong> All generated IPs are in standard dotted decimal notation (e.g., 192.168.1.1)</li>
            <li><strong>Custom Naming:</strong> Downloaded files are named based on the selected country (for CSV files)</li>
          </ul>
        </section>

        <section>
          <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200 mb-2">File Format Details</h3>
          <div className="space-y-2 text-gray-600 dark:text-gray-300 text-sm">
            <p><strong>JSON files:</strong> Use when you have pre-defined IP ranges in CIDR or range format</p>
            <p><strong>CSV files:</strong> Use when you have IP ranges organized by country and want to filter by specific countries</p>
            <p><strong>Long to IP conversion:</strong> CSV format uses 32-bit integers that are automatically converted to standard IP format</p>
          </div>
        </section>
      </div>
    </div>
  );
};