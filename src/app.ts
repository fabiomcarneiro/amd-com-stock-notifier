import chromedriver from 'chromedriver';
import { WebDriver, Builder, By, Key, WebElement, WebElementCondition, until } from 'selenium-webdriver';
import chrome from 'selenium-webdriver/chrome';
import fetch from 'node-fetch';
import notifier from 'node-notifier';

chrome.setDefaultService(new chrome.ServiceBuilder(chromedriver.path).build());

export default class Bot {
  static AMD_ITEMS_BLACKLIST = ['5334651000', ];
  url: string;
  phone?: string;
  debug: boolean;

  constructor(url: string, phone?: string, debug = false) {
    (this.url = url), (this.phone = phone), (this.debug = debug);
  }

  // main method
  async run() {
    try {
      // this creates a new chrome window
      const driver = await new Builder().forBrowser('chrome').build();
      await driver.sleep(1000);
      await this.navigateToUrl(driver);
      await this.detectChanges(driver);
    } catch (err) {
      console.error('ERROR NOT CAUGHT WHILE RUNNING BOT. MORE INFO BELOW');
      console.error(err);
    }
  }

  async navigateToUrl(driver: WebDriver) {
    await driver.navigate().to(this.url);
  }

  async detectChanges(driver: WebDriver) {
    let stock = false;

    while (!stock) {
      let datetime = new Date().toISOString().slice(0, 10);
      let currentMsg = `Refresh ${this.url} || time: ${datetime}`;
      await this.navigateToUrl(driver);

      console.info(currentMsg);

      let elements = await driver
        .findElements(By.className('btn-shopping-cart btn-shopping-neutral use-ajax'))
        .catch(() => console.error('Error finding cart elements'));

      if (elements) {
        let href = '';
        console.log('Found Elements to buy. Checking Blacklist');
        for (let element of elements) {
          let blacklisted = false;
          href = await element.getAttribute('href');
          for (let blackListedItem of Bot.AMD_ITEMS_BLACKLIST) {
            if (href.includes(blackListedItem.toString())) {
              blacklisted = true;
              console.log(`Item is blacklisted ${href}`);
              break;
            }
          }
          if (!blacklisted) {
            stock = true;
            let stockFoundMsg = `STOCK FOUND FOR ITEM : ${href} WEBSITE: ${this.url} || time: ${datetime}`;
            console.log(stockFoundMsg);
            notifier.notify({
              title: `Stock change`,
              message: stockFoundMsg,
              sound: true,
              wait: true
            });

            await this.sendSms(stockFoundMsg);
          }

          await driver.sleep(5000);
        }
      }
    }
  }

  async sendSms(msg: string) {
    if (this.phone !== undefined)
      try {
        await fetch('https://rest-api.d7networks.com/secure/send', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            Authorization: 'Basic aWlheTMyMjI6elIyNDVRVGY='
          },
          body: JSON.stringify({
            // @ts-ignore
            content: msg,
            from: 'STOCK AMD',
            to: this.phone!
          })
        })
          .then(() => console.log(`SMS sent successfully: ${msg}`))
          .catch(() => console.error(`Error sending SMS: ${msg}`));
      } catch (err) {
        console.error(`Couldn't send SMS: ${err}`);
      }
  }
}
