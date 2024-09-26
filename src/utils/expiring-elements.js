class ExpiringElements {
    constructor(interval) {
        this.elements = [];
        this.defaultInterval = interval || 3600000;

        this.startMonitoring();
    }

    addElement(element) {
        const timestamp = Date.now();
        this.elements.push({ element, timestamp });
    }

    checkElements() {
        const currentTime = Date.now();
        this.elements = this.elements.filter(({ timestamp }) => {
            return currentTime - timestamp <= this.defaultInterval;
        });
    }

    getElements() {
        return this.elements.map(({ element }) => element);
    }

    async startMonitoring() {
        while (true) {
            this.checkElements();

            await this.sleep(1000);
        }
    }

    sleep(ms) {
        return new Promise((resolve) => setTimeout(resolve, ms));
    }
}

module.exports = {
    ExpiringElements,
};
