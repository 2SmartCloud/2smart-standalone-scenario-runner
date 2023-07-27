class PIDController {
    constructor(input, targetPoint, Kp, Ki, Kd) {
        this.input = input;
        this.targetPoint = targetPoint;
        this.sampleTime = 1000;
        this.setOutputLimits(0, 255);// eslint-disable-line no-magic-numbers
        this.tune(Kp, Ki, Kd);
        this.lastTime = this.getMillis() - this.sampleTime || 0;

        this.ITerm = 0;
        this.output = 0;
        this.lastError = 0;
    }

    setInput(currentValue) {
        this.input = currentValue;
    }

    setPoint(targetPointValue) {
        this.targetPoint = targetPointValue;
    }

    getMillis() {
        const date = new Date();


        return date.getTime();
    }

    compute() {
        const now = this.getMillis();
        const timeChange = (now - this.lastTime);

        if (timeChange >= this.sampleTime) {
            const input = this.input;
            const error = this.targetPoint - input;

            this.ITerm += this.Ki !== 0 ? error / this.Ki : 0;

            const dInput = this.Kd !== 0 ? (error - this.lastError) * this.Kd : 0;

            let output = (this.Kp * error + this.ITerm + dInput);

            if (output >= this.outMax) {
                output = this.outMax;
            } else if (output <= this.outMin) {
                output = this.outMin;
            }

            this.output = output || 0;
            this.lastError = error;
            this.lastTime = now;

            return true;
        }

        return false;
    }

    setOutput(val) {
        let valueToSet;

        if (val > this.outMax) {
            this.output = val;
        } else if (val < this.outMin) {
            valueToSet = this.outMin;
        }

        this.output = valueToSet;
    }

    setOutputLimits(min, max) {
        if (min >= max) return;

        this.outMin = min;
        this.outMax = max;

        if (this.output > this.outMax) {
            this.output = this.outMax;
        } else if (this.output < this.outMin) {
            this.output = this.outMin;
        }

        if (this.ITerm > this.outMax) {
            this.ITerm = this.outMax;
        } else if (this.ITerm < this.outMin) {
            this.ITerm = this.outMin;
        }
    }

    tune(Kp, Ki, Kd) {
        if (Kp < 0 || Ki < 0 || Kd < 0) {
            return;
        }

        this.dispKp = Kp;
        this.dispKi = Ki;
        this.dispKd = Kd;
        this.sampleTimeInSec = (this.sampleTime) / 1000; // eslint-disable-line no-magic-numbers
        this.Kp = Kp;
        this.Ki = Ki * this.sampleTimeInSec;
        this.Kd = Kd / this.sampleTimeInSec;
    }

    setSampleTime(value) {
        if (value > 0) {
            const ratio = value / (1.0 * this.sampleTime);

            this.ratio = ratio;
            this.Ki *= ratio;
            this.Kd /= ratio;
            this.sampleTime = Math.round(value);
        }
    }

    getOutput() {
        return this.output;
    }

    getInput() {
        return this.input;
    }
}

module.exports = PIDController;
