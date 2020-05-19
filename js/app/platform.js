class Platform extends Vector2 {

    constructor(options) {
        super(options.x, options.y, options.width, options.height);
        this.previousX = 0;
        this.previousY = 0;
        this.color = options.color;
        this.spikes = [];
    }

    draw() {
        ctx.fillStyle = this.color;
        ctx.fillRect(this.x, this.y, this.width, this.height);
    }

    createSpikes(number) {
        this.spikes = [];
        try {
            for (let i = 0; i < number; i++) {
                const spike = new Spike({
                    x: this.x + random((25 + ctx.canvas.width / 50), this.width - ((25 + ctx.canvas.width / 50))),
                    y: this.y - (25 + ctx.canvas.width / 50),
                    width: 25 + ctx.canvas.width / 50,
                    height: 25 + ctx.canvas.width / 50
                });
                this.spikes.push(spike);
            }
        } catch (UninitialisedException) {
            console.log("Not spawning spikes: " + UninitialisedException);
        }
    }
}

class Spike extends Vector2 {

    constructor(options) {
        super(options.x, options.y, options.width, options.height);
        this.previousX = 0;
        this.previousY = 0;
        this.color = "#880E4F";
    }

    draw() {
        if (engine.maxSpikes >= 1) {
            ctx.beginPath();
            ctx.fillStyle = this.color;
            ctx.strokeStyle = "#000";
            ctx.lineWidth = 1;
            ctx.moveTo(this.x, this.y);
            ctx.lineTo(this.x + this.width / 2, this.y + this.height);
            ctx.lineTo(this.x - this.width / 2, this.y + this.height);
            ctx.lineTo(this.x, this.y);
            ctx.stroke();
            ctx.fill();
        }
    }

    update() {
        this.x -= engine.velocityX;
    }
}