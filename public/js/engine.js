import {Player} from "./player.js";
import {PlatformManager} from "./platform_manager.js";
import {Particle} from "./particle.js";
import {random, randomChoice} from "./util.js";

class GameEngine {

    constructor(ctx) {
        if (!GameEngine.instance) {
            this.ctx = ctx;
            this.score = 0;
            this.jumpCount = 0;
            this.velocityX = ctx.canvas.width / 100;
            this.accelerationTweening = ctx.canvas.width / 100;
            this.player = new Player({
                x: ctx.canvas.offsetWidth / 5,
                y: ctx.canvas.offsetHeight / 3,
                width: Math.min(32, ctx.canvas.offsetWidth / 25),
                height: Math.min(32, ctx.canvas.offsetWidth / 25),
                jumpSize: this.velocityX * -2
            });
            this.platformManager = new PlatformManager(ctx, this.player.calculate_jump_distance(this.velocityX, Math.abs(this.velocityX * -2)));
            this.particles = [];
            this.particlesIndex = 0;
            this.particlesMax = 15;
            this.collidedPlatform = null;
            this.scoreColor = '#fff';
            this.jumpCountRecord = 0;
            this.maxSpikes = 0;
            this.updated = false;
            GameEngine.instance = this;
        } else {
            this.restart();
        }
    }

    step() {
        this.update();
        this.draw();
    }

    update() {
        this.player.update();

        // game still playing.
        if (this.velocityX > 0) {
            this.score += Math.floor((1000/40) * (1 + (this.jumpCount > 0 ? this.jumpCount / 100 : 0)));
        }

        if (this.updated === false && this.jumpCount % 10 === 0 && this.jumpCount > 0) {
            this.updated = true;
            this.accelerationTweening *= 1.1;
            this.platformManager.minDistanceBetween *= 1.25;
            this.platformManager.maxDistanceBetween = this.player.calculate_jump_distance(this.velocityX, Math.abs(this.player.jumpSize));
            if (this.jumpCount % 20 === 0) this.maxSpikes++;
        } else if (this.jumpCount % 10 !== 0) {
            this.updated = false;
        }

        let intersectionCount = 0;
        this.velocityX += this.accelerationTweening / 2500;
        for (let platform of this.platformManager.platforms) {
            if (this.player.intersects(platform)) {

                intersectionCount++;
                this.collidedPlatform = platform;
                this.player.jumpsLeft = 2;
                // game still playing
                if (this.velocityX > 0) this.spawn_particles(this.player.x * 1.1, this.player.y + this.player.height * 0.975, 0, this.collidedPlatform);

                if (this.player.intersectsLeft(platform, this.velocityX)) {
                    console.log(platform.x + " " + platform.y);
                    console.log(this.player.x + " " + this.player.y + " " + this.player.velocityY + " " + this.player.height);
                    this.handle_collision(platform);
                } else {
                    this.player.x = this.player.previousX;
                    this.player.y = platform.y - this.player.height;
                    this.player.velocityY = 0;
                    this.player.onPlatform = true;
                }
            } 

            for (let spike of platform.spikes) {
                if (this.player.intersects(spike)) {
                    this.handle_collision(spike);
                }
            }
        }
        // not on a platform.
        if (intersectionCount === 0) this.player.onPlatform = false;
        // update each platform i.e. move them
        this.platformManager.update(this.ctx.canvas, this.velocityX, this.maxSpikes);
        // update all the particles.
        for (let particle of this.particles) {
            particle.update();
        }
    }

    handle_collision(obj) {
        // stop the screen moving, trigger restart screen
        this.velocityX = 0;
        this.accelerationTweening = 0;
        // reset the player variables.
        this.player.velocityX = 0; 
        this.player.x = obj.x - 48;
        this.player.velocityY = this.player.jumpSize/2;
        this.spawn_particles(this.player.x, this.player.y, this.player.height, obj);
        // make the restart screen visible.
        document.querySelector("#runner_after").style.display = "block";
    }

    draw() {
        this.player.draw(this.ctx);

        for (let platform of this.platformManager.platforms) {
            platform.draw(this.ctx);
            for (let spike of platform.spikes) {
                spike.draw(this.ctx);
            }
        }

        for (let particle of this.particles) {
            particle.draw(this.ctx);
        }
    }

    restart() {
        this.score = 0;
        this.jumpCount = 0;
        this.maxSpikes = 0;
        this.velocityX = this.ctx.canvas.width / 100;
        this.accelerationTweening = this.ctx.canvas.width / 100;
        this.player.restart(this.ctx);
        this.platformManager.updateOnDeath(this.ctx.canvas, this.player.calculate_jump_distance(this.velocityX, Math.abs(this.player.jumpSize)));
        this.particles = [];
        this.particlesIndex = 0;
        this.particlesMax = 15;
        this.collidedPlatform = null;
        this.scoreColor = '#fff';
    }

    spawn_particles(position_x, position_y, tolerance, collider) {
        for (let i = 0; i < 10; i++) {
            this.particles[(this.particlesIndex++) % this.particlesMax] = new Particle({
                x: position_x,
                y: tolerance == 0 ? position_y : random(position_y, position_y + tolerance),
                velocityY: random(-30, 30),
                color: collider.color,
                engineVelocity: this.velocityX,
                size: Math.min(32, this.ctx.canvas.offsetWidth / 25)/10
            });
        }
    }

    resize_entities(ctx, original_size) {
        this.ctx = ctx;
        let width_ratio = ctx.canvas.width / original_size[0];
        this.velocityX *= width_ratio;
        this.accelerationTweening *= width_ratio;

        this.player.resize(ctx, original_size, this.velocityX);
        this.platformManager.resize(ctx, original_size, this.player.calculate_jump_distance(this.velocityX, Math.abs(this.player.jumpSize)));
    }

    // make sure the player can jump, then adjust velocity.
    do_jump() {
        try {
            if (this.velocityX > 0 && this.player.jumpsLeft > 0) {
                this.player.velocityY = this.player.jumpSize;
                // now update the score
                this.jumpCount++;
                if (this.jumpCount > this.jumpCountRecord) {
                    this.jumpCountRecord = this.jumpCount;
                    let multiplerText = Math.floor((this.jumpCountRecord + 100) / 100) + '.';
                    document.querySelector("#runner_multiplier").innerHTML = (this.jumpCountRecord < 10 ? multiplerText + "0" :  multiplerText) + this.jumpCountRecord;
                }
                
                this.player.jumpsLeft--;
                this.player.onPlatform = false;
            }
        } catch (UninitialisedException) {
            console.log("Exception encountered when attempting to process a jump: \n" + UninitialisedException);
        }
    }
}

export default GameEngine