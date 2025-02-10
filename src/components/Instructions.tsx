import { type FC } from 'react';

export const Instructions: FC = () => {
  return (
    <div className="max-w-2xl mx-auto mb-8 p-6 bg-white dark:bg-gray-800 rounded-lg shadow-md">
      <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">Instructions</h2>
      
      <div className="space-y-4">
        <section>
          <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200 mb-2">Data File Format</h3>
          <p className="text-gray-600 dark:text-gray-300 mb-2">
            The application accepts a JSON file with the following structure:
          </p>
          <pre className="bg-gray-100 dark:bg-gray-700 p-4 rounded-md overflow-x-auto text-gray-800 dark:text-gray-100">
{`{
  "data": [
    ["1.186.0.0", "1.186.255.255", "65,536"],
    ["2.16.34.0", "2.16.34.255", "256"]
  ]
}`}
          </pre>
          <p className="text-gray-600 dark:text-gray-300 mt-2">
            Each array in the "data" array contains three elements:
          </p>
          <ul className="list-disc list-inside text-gray-600 dark:text-gray-300 ml-4">
            <li>Start IP address</li>
            <li>End IP address</li>
            <li>Number of IPs in range (as a string, can include commas)</li>
          </ul>
        </section>

        <section>
          <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200 mb-2">How to Use</h3>
          <ol className="list-decimal list-inside text-gray-600 dark:text-gray-300 space-y-2">
            <li>Drag and drop your JSON file containing IP ranges onto the upload area, or click to select a file</li>
            <li>Enter the number of IP addresses you want to generate</li>
            <li>Click the "Generate and Download IPs" button</li>
            <li>A text file containing the generated IP addresses will be downloaded automatically</li>
          </ol>
        </section>

        <section>
          <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200 mb-2">Notes</h3>
          <ul className="list-disc list-inside text-gray-600 dark:text-gray-300 space-y-1">
            <li>The generator will distribute IP addresses across different ranges</li>
            <li>Each IP address is randomly generated within the specified ranges</li>
            <li>Duplicate IP addresses are automatically removed</li>
            <li>The output is a plain text file with one IP address per line</li>
          </ul>
        </section>
      </div>
    </div>
  );
};