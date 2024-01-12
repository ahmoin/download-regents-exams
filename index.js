import puppeteer from "puppeteer";
import axios from "axios";
import fs from "fs";
import path from "path";

(async () => {
  const folderPath = path.join(process.cwd(), "pdfs");
  if (!fs.existsSync(folderPath)) {
    fs.mkdirSync(folderPath);
  }

  const browser = await puppeteer.launch({ headless: "new" });
  const page = await browser.newPage();

  await page.goto("https://www.nysedregents.org/Chemistry/");

  await page.$eval("#content-center > p > a:nth-child(1)", (element) =>
    element.click()
  );

  const descendantElements = await page.$$("#content-center > ul *");

  for (const element of descendantElements) {
    const containsExamination = await page.evaluate(
      (el) => el.textContent.includes("Examination"),
      element
    );
    const doesNotContainNotice = await page.evaluate(
      (el) => !el.textContent.includes("Notice"),
      element
    );
    const isPdfLink = await page.evaluate(
      (el) => el.href && el.href.toLowerCase().endsWith(".pdf"),
      element
    );

    if (containsExamination && doesNotContainNotice && isPdfLink) {
      const textContent = await page.evaluate(
        (el) => el.textContent.trim(),
        element
      );
      const pdfLink = await page.evaluate((el) => el.href, element);
      const pdfFileName = path.basename(pdfLink);
      if (
        !pdfLink.includes("exam-lt") &&
        !pdfLink.includes("examlt") &&
        !pdfLink.includes("ltexam")
      ) {
        const pdfResponse = await axios({
          method: "get",
          url: pdfLink,
          responseType: "arraybuffer",
        });

        fs.writeFileSync(path.join(folderPath, pdfFileName), pdfResponse.data);
        console.log(pdfFileName + " successfully downloaded");
      }
    }
  }

  await browser.close();
})();
