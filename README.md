# Instagram Profile Scraper

This Node.js script uses Puppeteer to scrape data from a public Instagram profile, including profile information and a selection of recent posts with their like and comment counts.  The scraped data is exported in JSON format to the `public/instaurl.json` file.

## Features

*   **Scrapes Profile Data:** Extracts detailed profile information such as username, full name, profile picture URL, biography, number of posts, followers count, and following count.
*   **Scrapes Post Data:** Retrieves the URLs, thumbnails, and captions of the most recent posts (up to 12).  Also scrapes the like and comment counts for each post.
*   **Comprehensive Selectors:** Employs robust selectors to handle variations in Instagram's HTML structure, improving reliability.
*   **Error Handling:** Includes extensive error handling to gracefully manage potential issues during scraping.
*   **Headless Browser:** Runs in headless mode, allowing for background execution.
*   **User Agent Spoofing:**  Sets a realistic user agent to mimic a real browser.
*   **Dynamic Content Loading:** Scrolls the page to load more posts, ensuring a larger dataset.
*   **Login Popup Handling:** Attempts to automatically dismiss potential login popups.
*   **Command-Line Username Input:**  Accepts the Instagram username as a command-line argument.

## Prerequisites

*   **Node.js:**  Make sure you have Node.js (version 16 or higher recommended) installed.  You can download it from [https://nodejs.org/](https://nodejs.org/).
*   **npm or Yarn:**  Node Package Manager (npm) is included with Node.js.  Alternatively, you can use Yarn.

## Setup and Installation

1.  **Clone the Repository:**

    ```bash
    git clone <your-repo-url>
    cd insta-scraper
    ```

2.  **Install Dependencies:**

    Using npm:

    ```bash
    npm install
    ```

    Using Yarn:

    ```bash
    yarn install
    ```

## Usage

1.  **Run the scraper:**

    You can run the scraper with or without specifying a username. If no username is provided, it will default to scraping the "instagram" profile.

    *   **To scrape a specific profile:**

        ```bash
        node index.js <instagram_username>
        ```

        Replace `<instagram_username>` with the actual Instagram username you want to scrape (e.g., `node index.js nasa`).

    *   **To scrape the default "instagram" profile:**

        ```bash
        node index.js
        ```

    This will launch Puppeteer, navigate to the specified Instagram profile, scrape the data, and save it to `public/instaurl.json`. The script outputs progress and error messages to the console.

2.  **View the Output:**

    The scraped data will be available in the `public/instaurl.json` file.  If the `public` folder doesn't exist, the script will create it.

## Automation (Scheduled Scraping)

To automate the scraping process, you can use tools like:

*   **Cron (Linux/macOS):**  Cron is a time-based job scheduler in Unix-like operating systems.  You can use it to run your script at regular intervals.

    Example crontab entry (runs the script every day at 2:00 AM):

    ```
    0 2 * * * /usr/bin/node /path/to/your/insta-scraper/index.js <instagram_username>
    ```

    *   **Important:** Replace `/usr/bin/node` with the actual path to your Node.js executable. Use `which node` to find the path.  Replace `/path/to/your/insta-scraper/index.js` with the full path to your script. Replace `<instagram_username>` with the desired username, or leave it out to use the default "instagram" profile.

*   **Task Scheduler (Windows):**  Windows provides a Task Scheduler that can be used to schedule tasks.  Make sure to include the username as an argument in the scheduled task.

*   **Node.js Libraries (e.g., `node-cron`):**  You can use libraries like `node-cron` directly within your Node.js application to schedule the scraping.  Install it with `npm install node-cron` or `yarn add node-cron`.  Remember to pass the username as an argument to the scraping function.

## Important Considerations and Error Handling

*   **Instagram's HTML Structure:** Instagram's HTML structure can change, which may break the selectors used in the script.  The script includes robust selectors, but it is essential to monitor the script for errors and update the selectors as needed.
*   **Rate Limiting:** Instagram may block or rate-limit your requests if you scrape too aggressively.  The script includes delays to mitigate this, but it is still possible to be blocked.  Consider using rotating proxies or other techniques if you encounter rate limiting.
*   **Error Handling:** The script includes `try...catch` blocks to handle potential errors gracefully and logs errors to the console.
*   **`public` Folder:**  The script automatically creates the `public` folder if it does not exist.
*   **User Agent:** The script sets a realistic user agent to mimic a real browser, helping to avoid detection as a bot.
*   **Login Popups:** The script attempts to automatically dismiss potential login popups.
*   **Resource Intensive:** Puppeteer can be resource-intensive. Monitor CPU and memory usage, especially when scheduling the script to run frequently.

## Disclaimer

Web scraping can be a sensitive topic. Always respect the terms of service of the website you are scraping. Be mindful of the load you are placing on the server, and avoid scraping personal information without consent. This project is intended for educational purposes only. The author is not responsible for any misuse of this tool. Scraping Instagram may violate their Terms of Use. Use at your own risk.

## Contributing

Contributions are welcome! Please submit a pull request with your changes.

## License

[MIT License]