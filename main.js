/*
 Function  : Final project: BB_Bomb
 Author    : WEI, Lixin
 Build_Date: Dec. 05, 2016
 Version   : 1.0
 */

//Global variables
var canvas = document.getElementById("canvas"),
    ctx = canvas.getContext("2d");

var FRAME_SPEED = 10,
    HERO_SIZE = 10,
    KEY_DOWN_STEP = 10,
    LASER_SPEED = 15,
    LASER_SHOT_INTERVAL = [-1,100,100,100,100,10],
    LASER_DAMAGE = [-1,1,1,1,1,0.5],
    INFO_BOARD_HEIGHT = 100,
    CANVAS_HEIGHT = canvas.height-INFO_BOARD_HEIGHT,
    INIT_HP = 100;

var isGameOver = false,
    isKeyDownLeft = false,
    isKeyDownRight = false,
    isKeyDownUp = false,
    isKeyDownDown = false,
    isShooting = false,
    lastShotTime = +new Date(),
    mousePos = new Victor(0,0),
    lastEnemyProductTime = +new Date(),
    enemyProductItv = 100; //ms

var hero = new Hero(),
    laserCollection = new LaserCollection(),
    enemyCollection = new EnemyCollection(),
    infoBoard = new InfoBoard();

//Class

function Enemy(pos, hp) {
    this.pos = pos;
    this.hp = hp;
    this.size = 0;
    this.speed = Math.max(10-hp, 1);
    this.isBeingAttacked = false;
    this.draw = function () {
        ctx.save();
        ctx.beginPath();
        if(this.isBeingAttacked) {
            this.isBeingAttacked = false;
            ctx.fillStyle = "red";
        }
        else ctx.fillStyle = "rgb(255,255,255)";
        ctx.arc(this.pos.x, this.pos.y, this.size, 0, Math.PI*2, true);
        ctx.fill();
        ctx.restore();
        ctx.closePath();
    };
    this.move = function (moveVec) {
        this.pos.add(moveVec);
    };
    this.isDead = function () {
        return this.hp<=0;
    };
    this.update = function () {
        this.size = Math.max(this.hp*2+5, 3);
        var dir = hero.pos.clone().subtract(this.pos);
        var speed = this.speed;
        if(this.isBeingAttacked) speed = -speed*3;
        dir.normalize();
        this.move(dir.multiply(new Victor(speed, speed)));
    }
}
function Hero() {
    this.pos = new Victor( canvas.width/2,CANVAS_HEIGHT/2);
    this.hp = INIT_HP;
    this.isBeingAttacked = false;
    this.attackFrameCnt = 0;
    this.ATTACK_REMAINING_FRAME = 5;
    this.MAX_LINE_WIDTH = 3;
    this.MIN_LINE_WIDTH = 1;
    this.lineWidth = 1;
    this.lineAnimateDir = 1;
    this.shotType = 1;
    this.laserShotInterval = LASER_SHOT_INTERVAL[this.shotType];//ms pre shot
    this.draw = function () {
        ctx.save();
        ctx.beginPath();
        if(this.isBeingAttacked) {
            ctx.strokeStyle="red";
            this.attackFrameCnt++;
        }
        else ctx.strokeStyle="white";

        ctx.lineWidth = this.lineWidth;
        ctx.arc(this.pos.x, this.pos.y, HERO_SIZE, 0, Math.PI*2, true);
        ctx.stroke();
        ctx.closePath();
        ctx.restore();
    };
    this.move = function (moveVec) {
        this.pos.add(moveVec);
        if(this.pos.x>canvas.width) this.pos.x=canvas.width;
        if(this.pos.y>CANVAS_HEIGHT) this.pos.y=CANVAS_HEIGHT;
        if(this.pos.x<0) this.pos.x=0;
        if(this.pos.y<0) this.pos.y=0;
    };
    this.update = function (dt) {
        if(this.attackFrameCnt>=this.ATTACK_REMAINING_FRAME) {
            this.attackFrameCnt = 0;
            this.isBeingAttacked = false;
        }
        this.lineWidth += dt*this.lineAnimateDir;
        if(this.lineWidth>this.MAX_LINE_WIDTH || this.lineWidth<this.MIN_LINE_WIDTH)
            this.lineAnimateDir = -this.lineAnimateDir;
    };
    this.changeShotType  = function (type) {
        this.shotType=type;
        this.laserShotInterval=LASER_SHOT_INTERVAL[type];
    };
    this.shot = function () {
        var dir = new Victor(mousePos.x-hero.pos.x, mousePos.y-hero.pos.y);
        switch (this.shotType)
        {
            case 1: //normal
                laserCollection.addElement(new Laser(hero.pos.clone(), dir.clone(), 10*Math.random()+10, LASER_SPEED, LASER_DAMAGE[this.shotType]));
                break;
            case 2:
                for(var i=-Math.PI/2+0.5 ; i<=Math.PI/2-0.5 ; i+=0.1) {
                    laserCollection.addElement(new Laser(hero.pos.clone(), dir.clone().rotate(i), 10*Math.random()+10, LASER_SPEED, LASER_DAMAGE[this.shotType]));
                }
                break;
            case 5: //BOMB!
                for(var i=-Math.PI/2+0.5 ; i<=Math.PI/2-0.5 ; i+=0.1*Math.random()) {
                    laserCollection.addElement(new Laser(hero.pos.clone(), dir.clone().rotate(i), 10*Math.random()+10, LASER_SPEED, LASER_DAMAGE[this.shotType]));
                }
                break;
        }
    }
}
function Laser(center, dir, len, speed, damage) {
    this.dir = dir.normalize();
    this.len = len;
    this.startPos = center;
    this.endPos = this.startPos.clone().add(this.dir.clone().multiply(new Victor(this.len,this.len)));
    this.speed = speed;
    this.damage = damage || 1;

    this.draw = function() {
        ctx.save();
        ctx.beginPath();
        ctx.moveTo(this.startPos.x, this.startPos.y);
        ctx.lineTo(this.endPos.x, this.endPos.y);
        ctx.stroke();
        // ctx.arc(this.endPos.x, this.endPos.y, 5, 0, Math.PI*2, true);
        // ctx.stroke();
        ctx.closePath();
        ctx.restore();
    };
    this.update = function () {
        var d = dir.clone().multiply(new Victor(speed, speed));
        this.startPos.add(d);
        this.endPos.add(d);
    };
    this.isOut = function () {
        return this.startPos.x>canvas.width || this.startPos.x<0 || this.startPos.y>CANVAS_HEIGHT || this.startPos.y<0;
    };
}

function Collection() {
    this.elementList = new buckets.LinkedList();
    this.addElement = function (element) {
        this.elementList.add(element);
    };
    this.draw = function () {
        this.elementList.forEach(function (obj) {
            obj.draw();
        });
    };
    this.update = function () {
        this.elementList.forEach(function (obj) {
            obj.update();
        });
    };
}
function EnemyCollection() {
    Collection.call(this);
    this.dropDead = function () {
        for(var i=0 ; i<this.elementList.size() ; ++i) { //Remove lasers out of screen
            var temp = this.elementList.first();
            this.elementList.removeElementAtIndex(0);
            if(!temp.isDead()) this.elementList.add(temp);
        }
    };
    this.calCollisionWithHero = function () {
        this.elementList.forEach(function (obj) {
            if(dis(obj.pos, hero.pos)<HERO_SIZE){
                hero.hp-=obj.hp;
                hero.isBeingAttacked = true;
                obj.hp=0;
            }
        })
    };
}
function LaserCollection() {
    Collection.call(this);
    this.dropOuterLaser = function () {
        for(var i=0 ; i<this.elementList.size() ; ++i) { //Remove lasers out of screen
            var temp = this.elementList.first();
            this.elementList.removeElementAtIndex(0);
            if(!temp.isOut()) this.elementList.add(temp);
        }
    };
    this.calCollision = function () {
        for(var i=0 ; i<this.elementList.size() ; ++i) {
            var laser = this.elementList.first();
            this.elementList.removeElementAtIndex(0);
            var flag = false;
            for(var j=0 ; j<enemyCollection.elementList.size() ; ++j) {
                var enemy = enemyCollection.elementList.first();
                enemyCollection.elementList.removeElementAtIndex(0);
                if(dis(laser.endPos, enemy.pos)<enemy.size) {
                    //one laser only attack one enemy
                    if(!flag)infoBoard.score+=Math.min(enemy.hp, laser.damage);
                    if(!flag)enemy.hp -= laser.damage;
                    enemy.isBeingAttacked = true;
                    flag = true;
                }
                enemyCollection.elementList.add(enemy);
            }
            if(flag == false) this.elementList.add(laser);
        }
    };
}

function InfoBoard() {
    this.hp = INIT_HP;
    this.HP_BAR_WIDTH=300;
    this.HP_BAR_HEIGHT=20;
    this.score = 0;
    this.update = function () {
        this.hp = hero.hp;
    };
    this.draw = function () {
        ctx.save();
        ctx.fillStyle="black";
        ctx.fillRect(0, CANVAS_HEIGHT, canvas.width, INFO_BOARD_HEIGHT);

        ctx.beginPath();
        ctx.strokeStyle = "white";
        ctx.moveTo(0, CANVAS_HEIGHT);
        ctx.lineTo(canvas.width, CANVAS_HEIGHT);
        ctx.stroke();
        ctx.closePath();

        //HP bar
        ctx.fillStyle="white";
        ctx.textAlign="left";
        ctx.textBaseline="middle";
        ctx.font="20pt Arial";
        ctx.fillText("HP:", 10, INFO_BOARD_HEIGHT/2+CANVAS_HEIGHT);

        if(hero.isBeingAttacked){
            ctx.fillStyle="red";
            ctx.strokeStyle="red";
        }
        else {
            ctx.fillStyle="white";
            ctx.strokeStyle="white";
        }
        ctx.strokeRect(70, INFO_BOARD_HEIGHT/2+CANVAS_HEIGHT-this.HP_BAR_HEIGHT/2, this.HP_BAR_WIDTH, this.HP_BAR_HEIGHT);
        ctx.fillRect(70, INFO_BOARD_HEIGHT/2+CANVAS_HEIGHT-this.HP_BAR_HEIGHT/2, this.HP_BAR_WIDTH*this.hp/INIT_HP, this.HP_BAR_HEIGHT);

        //Score
        ctx.fillStyle="white";
        ctx.textAlign="right";
        ctx.fillText("SCORE: "+this.score.toFixed(0), canvas.width-10, INFO_BOARD_HEIGHT/2+CANVAS_HEIGHT);
        ctx.restore();
    }
}
//Function
function dis(pt1, pt2) {
    return Math.sqrt((pt1.x-pt2.x)*(pt1.x-pt2.x) + (pt1.y-pt2.y)*(pt1.y-pt2.y));
}
function draw() {
    ctx.save();
    ctx.fillStyle = "rgba(0,0,0,0.4)";
    ctx.fillRect(0, 0, canvas.width, CANVAS_HEIGHT);
    hero.draw();
    laserCollection.draw();
    enemyCollection.draw();
    infoBoard.draw();
    ctx.restore();
}
function update() {
    //hero movement START
    var dx = 0, dy = 0;
    if(isKeyDownLeft) dx -= 1;
    if(isKeyDownRight) dx += 1;
    if(isKeyDownUp) dy -= 1;
    if(isKeyDownDown) dy += 1;
    if(dx && dy) {
        var w = KEY_DOWN_STEP*Math.sqrt(2)/2;
        dx *= w;
        dy *= w;
    }
    else if(dx) {
        dx *= KEY_DOWN_STEP;
    }
    else if(dy) {
        dy *= KEY_DOWN_STEP;
    }
    hero.move(new Victor(dx, dy));
    //hero movement END
    hero.update(0.1);

    var now = +new Date();
    var itv = now-lastShotTime;
    if(itv>=hero.laserShotInterval && isShooting) {
        lastShotTime=now;
        hero.shot();
    }
    laserCollection.update();
    laserCollection.calCollision();
    laserCollection.dropOuterLaser();

    itv = now-lastEnemyProductTime;
    if(itv>=enemyProductItv) {
        lastEnemyProductTime = now;
        var dir = Math.floor(rand(1,4));
        var len;
        var st = new Victor(0,0);
        if(dir==1 || dir==2) {
            len = rand(0,canvas.width);
            st.x=len;
            if(dir==2) st.y=CANVAS_HEIGHT;
        }
        else {
            len = rand(0,CANVAS_HEIGHT);
            st.y=len;
            if(dir==4) st.x=canvas.width;
        }
        enemyCollection.addElement(new Enemy(st, Math.floor(rand(1,10))));
    }
    enemyCollection.update();
    enemyCollection.calCollisionWithHero();
    enemyCollection.dropDead();

    infoBoard.update();
    if(hero.hp<0) isGameOver=true;
    //console.log(hero.hp);
    //console.log(laserCollection.elementList.size());
    //console.log(enemyCollection.elementList.size());
}
function rand(a, b) { //[a,b];
    b+=1;
    return Math.random()*(b-a)+a;
}
function timeOut() {
    draw();
    update();
    if(isGameOver == false) {
        requestAnimationFrame(timeOut);
        //setTimeout(timeOut, FRAME_SPEED);
    }
    else {
        showGameOver();
    }
}
function showGameOver() {
    ctx.save();
    ctx.fillStyle="black";
    ctx.fillRect(0,0,canvas.width,canvas.height);
    ctx.fillStyle="white";
    ctx.font="50pt Arial";
    ctx.textAlign="center";
    ctx.textBaseline="middle";
    ctx.fillText("GAME OVER!",canvas.width/2,canvas.height/2);
    ctx.font="15pt Arial";
    ctx.fillText("SCORE:"+infoBoard.score.toFixed(0), canvas.width/2, canvas.height/2+75);
    ctx.restore();
}
//Event
document.onkeydown = function (event) {
    event.preventDefault();
    if(event.keyCode == 37 || event.keyCode == 65) { // left
        isKeyDownLeft = true;
    }
    if(event.keyCode == 38 || event.keyCode == 87) { // up
        isKeyDownUp = true;
    }
    if(event.keyCode == 39 || event.keyCode == 68) { // right
        isKeyDownRight = true;
    }
    if(event.keyCode == 40 || event.keyCode == 83) { // down
        isKeyDownDown = true;
    }
    if(event.keyCode>=49 && event.keyCode<=57) { //switch shot type
        hero.changeShotType(event.keyCode-49+1);
    }
};
document.onkeyup = function (event) {
    event.preventDefault();
    if(event.keyCode == 37 || event.keyCode == 65) { // left
        isKeyDownLeft = false;
    }
    if(event.keyCode == 38 || event.keyCode == 87) { // up
        isKeyDownUp = false;
    }
    if(event.keyCode == 39 || event.keyCode == 68) { // right
        isKeyDownRight = false;
    }
    if(event.keyCode == 40 || event.keyCode == 83) { // down
        isKeyDownDown = false;
    }
};
canvas.onmousedown = function (event) {
    isShooting = true;
};
canvas.onmouseup = function (event) {
    isShooting = false;
};
canvas.onmousemove = function (event) {
    mousePos = new Victor(event.offsetX, event.offsetY);
};
//Init
ctx.fillRect(0, 0, canvas.width, CANVAS_HEIGHT);
ctx.strokeStyle = "white";
timeOut();