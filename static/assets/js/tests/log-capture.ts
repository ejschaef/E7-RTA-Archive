

const NORMAL_LOG = console.log

export class LogCapture {
    logString = ""

    redirect() {
        console.log = (...args) => {
            let strings = args.map((arg) => arg.toString());
            this.push(strings.join(" "));
        }
    }

    restore() {
        console.log = NORMAL_LOG;
    }

    push(str: string) {
        this.logString += str + "\n";
    }

    clear() {
        this.logString = "";
    }

    flushAndRestore() {
        const string = this.logString;
        this.clear();
        this.restore();
        return string
    }
}