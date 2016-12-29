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
    LASER_SHOT_INTERVAL = [100,100,100,100,50,45,100,100,100,100,100],
    LASER_DAMAGE = [1,1,1,1,1,1,1,1,1],
    INFO_BOARD_HEIGHT = 100,
    CANVAS_HEIGHT = canvas.height-INFO_BOARD_HEIGHT,
    INIT_HP = 100,
    ENERGY_LIMIT = [0, 100, 250, 400, 650, 1200, 3000],
    ENERGY_DESC = [0.01, 0.05, 0.15, 0.2, 0.3, 0.5],
    ENEMY_PRODUCT_ITV_LIMIT = 18,
    TREASURE_ITV = 50000;

var currentPage = 0, //0 welcome, 1 game, 2 game over, 3 help
    treasureCnt = 0,
    isKeyDownLeft = false,
    isKeyDownRight = false,
    isKeyDownUp = false,
    isKeyDownDown = false,
    isShooting = false,
    lastShotTime = +new Date(),
    mousePos = new Victor(0,0),
    lastEnemyProductTime = +new Date(),
    lastTreasureTime = +new Date(),
    enemyProductItv = 1000; //ms

var hero = new Hero(),
    laserCollection = new LaserCollection(),
    enemyCollection = new EnemyCollection(),
    treasureCollection = new TreasureCollection(),
    infoBoard = new InfoBoard(),
    buttonCollection = new ButtonCollection();

//Class

function Enemy(pos, hp, hasTreasure) {
    this.pos = pos;
    this.hp = hp;
    this.size = 0;
    this.speed = Math.max(10-hp, 1);
    this.isBeingAttacked = false;
    this.attackFrameCnt = 0;
    this.ATTACK_REMAINING_FRAME = 2;
    this.hasTreasure = hasTreasure || false;
    this.draw = function () {
        ctx.save();
        ctx.beginPath();
        if(this.isBeingAttacked) {
            this.attackFrameCnt++;
            ctx.fillStyle = "rgb(150,0,0)";
        }
        else {
            if(this.hasTreasure) ctx.fillStyle = "orange";
            else ctx.fillStyle = "rgb(255,255,255)";
        }

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
        if(this.attackFrameCnt>=this.ATTACK_REMAINING_FRAME) {
            this.attackFrameCnt = 0;
            this.isBeingAttacked = false;
        }
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
    this.shotType = 0;
    this.laserShotInterval = LASER_SHOT_INTERVAL[this.shotType];//ms pre shot
    this.energy = 0;
    this.isSuperLaserNow = false;
    this.superLaserFrameCnt = 0;
    this.SUPER_LASER_REMAINING_FRAME = 700;
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
    this.superLaser = function () {
        this.isSuperLaserNow = true;
        this.superLaserFrameCnt = 0;
        this.laserShotInterval = 10;
    };
    this.addEnergy = function (num) {
        this.energy += num;
        var maxEnergy = ENERGY_LIMIT[ENERGY_LIMIT.length-1];
        if(this.energy>maxEnergy) this.energy = maxEnergy;
        if(this.energy<0)this.energy = 0;
    };
    this.move = function (moveVec) {
        this.pos.add(moveVec);
        if(this.pos.x>canvas.width) this.pos.x=canvas.width;
        if(this.pos.y>CANVAS_HEIGHT) this.pos.y=CANVAS_HEIGHT;
        if(this.pos.x<0) this.pos.x=0;
        if(this.pos.y<0) this.pos.y=0;
    };
    this.update = function (dt) {
        //update super laser
        if(this.isSuperLaserNow) {
            this.superLaserFrameCnt ++;
            if(this.superLaserFrameCnt>=this.SUPER_LASER_REMAINING_FRAME) {
                this.isSuperLaserNow = false;
                this.changeShotType(this.shotType);//reset
            }
        }
        //update shot type by energy
        if(!this.isSuperLaserNow) {
            this.addEnergy(-ENERGY_DESC[this.shotType]);
            var type = -1;
            for(var i=ENERGY_LIMIT.length-2 ; i>=0 ; --i) {
                if(this.energy>=ENERGY_LIMIT[i]) {
                    type = i;
                    break;
                }
            }
            this.changeShotType(type);
        }

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
        if(this.isSuperLaserNow) {
            for(var i=-Math.PI/2+0.5 ; i<=Math.PI/2-0.5 ; i+=0.1*Math.random()) {
                laserCollection.addElement(new Laser(hero.pos.clone(), dir.clone().rotate(i), 10*Math.random()+10, LASER_SPEED, LASER_DAMAGE[this.shotType]));
            }
        }
        else {
            switch (this.shotType)
            {
                case 0: //normal
                    laserCollection.addElement(new Laser(hero.pos.clone(), dir.clone(), 10*Math.random()+10, LASER_SPEED, LASER_DAMAGE[this.shotType]));
                    break;
                case 1:
                    for(var i=-Math.PI/2+1.5 ; i<=Math.PI/2-1.5 ; i+=0.1) {
                        laserCollection.addElement(new Laser(hero.pos.clone(), dir.clone().rotate(i), 10*Math.random()+10, LASER_SPEED, LASER_DAMAGE[this.shotType]));
                    }
                    break;
                case 2:
                    for(var i=-Math.PI/2+1.3 ; i<=Math.PI/2-1.3 ; i+=0.1) {
                        laserCollection.addElement(new Laser(hero.pos.clone(), dir.clone().rotate(i), 10*Math.random()+10, LASER_SPEED, LASER_DAMAGE[this.shotType]));
                    }
                    break;
                case 3:
                    for(var i=-Math.PI/2+1.1 ; i<=Math.PI/2-1.1 ; i+=0.1) {
                        laserCollection.addElement(new Laser(hero.pos.clone(), dir.clone().rotate(i), 10*Math.random()+10, LASER_SPEED, LASER_DAMAGE[this.shotType]));
                    }
                    break;
                case 4:
                    for(var i=-Math.PI/2+0.9 ; i<=Math.PI/2-0.9 ; i+=0.1) {
                        laserCollection.addElement(new Laser(hero.pos.clone(), dir.clone().rotate(i), 10*Math.random()+10, LASER_SPEED, LASER_DAMAGE[this.shotType]));
                    }
                    break;
                case 5:
                    for(var i=-Math.PI/2+0.5 ; i<=Math.PI/2-0.5 ; i+=0.1) {
                        laserCollection.addElement(new Laser(hero.pos.clone(), dir.clone().rotate(i), 10*Math.random()+10, LASER_SPEED, LASER_DAMAGE[this.shotType]));
                    }
                    break;
                case 6:
                    for(var i=-Math.PI/2+0.5 ; i<=Math.PI/2-0.5 ; i+=0.05) {
                        laserCollection.addElement(new Laser(hero.pos.clone(), dir.clone().rotate(i), 10*Math.random()+10, LASER_SPEED, LASER_DAMAGE[this.shotType]));
                    }
                    break;
            }
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
function Treasure(pos) {
    this.pos = pos;
    this.TREASURE_SIZE = 20;
    this.dir = new Victor(rand(-1,1),rand(-1,1)).normalize();
    this.update = function () {
        this.pos.add(this.dir.clone().multiply(new Victor(0.5,0.5)));
        if(this.pos.x<0) {
            this.pos.x = 0;
            this.dir.x = -this.dir.x;
        }
        else if(this.pos.x>canvas.width) {
            this.pos.x = canvas.width;
            this.dir.x = -this.dir.x;
        }
        else if(this.pos.y<0) {
            this.pos.y = 0;
            this.dir.y = -this.dir.y;
        }
        else if(this.pos.y>CANVAS_HEIGHT) {
            this.pos.y = CANVAS_HEIGHT;
            this.dir.y = -this.dir.y;
        }
    };
    this.draw = function () {
        ctx.save();
        ctx.beginPath();
        ctx.arc(this.pos.x, this.pos.y, this.TREASURE_SIZE, 0, Math.PI*2, true);
        ctx.strokeStyle="orange";
        ctx.fillStyle = "orange";
        ctx.fill();
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.font = "15pt Arial";
        ctx.fillStyle = "black";
        ctx.fillText("B", this.pos.x, this.pos.y);
        ctx.closePath();
        ctx.restore();
    }
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
            else { //dead
                if(temp.hasTreasure)treasureCollection.addElement(new Treasure(temp.pos));
            }
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
                    if(!flag) {
                        var s = Math.min(enemy.hp, laser.damage);
                        infoBoard.score += s;
                        if(!hero.isSuperLaserNow)hero.addEnergy(s);
                        if(hero.isSuperLaserNow)hero.hp+=0.1;
                        if(hero.hp>INIT_HP)hero.hp=INIT_HP;
                        enemy.hp -= laser.damage;
                    }
                    enemy.isBeingAttacked = true;
                    flag = true;
                }
                enemyCollection.elementList.add(enemy);
            }
            if(flag == false) this.elementList.add(laser);
        }
    };
}
function TreasureCollection() {
    Collection.call(this);
    this.calEat = function () {
        for(var i=0 ; i<this.elementList.size() ; ++i) {
            var temp = this.elementList.first();
            this.elementList.removeElementAtIndex(0);
            if(dis(temp.pos, hero.pos)<=HERO_SIZE+temp.TREASURE_SIZE)
                treasureCnt++;
            else this.elementList.add(temp);
        }
    }
}
function ButtonCollection() {
    Collection.call(this);
    this.update = function (x, y) {
        this.elementList.forEach(function (obj) {
            obj.update(x, y);
        });
    };
    this.calClick = function () {
        this.elementList.forEach(function (obj) {
            if(obj.isMouseOver) obj.onClick();
        });
    }
}

function Button(pos, width, height, text) {
    this.pos = pos;
    this.width = width;
    this.height = height;
    this.text = text;
    this.isMouseOver = false;
    this.calIsMouseOver = function (x, y) {
        if(x>=this.pos.x && x<=this.pos.x+this.width && y>=this.pos.y && y<=this.pos.y+this.height)
            this.isMouseOver = true;
        else
            this.isMouseOver = false;
        return this.isMouseOver;
    };
    this.update = function (x, y) {
        this.calIsMouseOver(x, y);
    };
    this.draw = function () {
        ctx.save();
        ctx.strokeStyle="white";
        ctx.strokeRect(this.pos.x, this.pos.y, this.width, this.height);

        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.font = "15pt Arial";
        if(!this.isMouseOver) {
            ctx.fillStyle="white";
            ctx.fillText(this.text, this.pos.x+this.width/2, this.pos.y+this.height/2);
        }
        else {
            ctx.fillStyle = "white";
            ctx.fillRect(this.pos.x, this.pos.y, this.width, this.height);
            ctx.fillStyle = "black";
            ctx.fillText(this.text, this.pos.x+this.width/2, this.pos.y+this.height/2);
        }
        ctx.restore();
    }
}
function InfoBoard() {
    this.hp = INIT_HP;
    this.energy = 0;
    this.HP_BAR_WIDTH=200;
    this.HP_BAR_HEIGHT=20;
    this.ENERGY_BAR_WIDTH = 200;
    this.ENERGY_BAR_HEIGHT = 20;
    this.score = 0;
    this.flashFrameCnt = 0;
    this.isFlashing = false;
    this.FLASH_REMAINING_FRAME = 3;
    this.update = function () {
        this.hp = hero.hp;
        this.energy = hero.energy;
        if(hero.isSuperLaserNow) {
            this.flashFrameCnt ++;
            if(this.flashFrameCnt>=this.FLASH_REMAINING_FRAME) {
                this.flashFrameCnt = 0;
                this.isFlashing = !this.isFlashing;
            }
        }
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

        //energy bar
        ctx.fillStyle="white";
        ctx.textAlign="left";
        ctx.textBaseline="middle";
        ctx.font="20pt Arial";
        if(hero.isSuperLaserNow) {
            if(this.isFlashing) {
                ctx.fillStyle="red";
                ctx.strokeStyle="red";
            }
            else {
                ctx.fillStyle="white";
                ctx.strokeStyle="white";
            }
            ctx.fillText("MAX", 300, INFO_BOARD_HEIGHT/2+CANVAS_HEIGHT);
            percent = 1-hero.superLaserFrameCnt/hero.SUPER_LASER_REMAINING_FRAME;
            ctx.strokeRect(10+60+300, INFO_BOARD_HEIGHT/2+CANVAS_HEIGHT-this.ENERGY_BAR_HEIGHT/2, this.ENERGY_BAR_WIDTH, this.ENERGY_BAR_HEIGHT);
            ctx.fillRect(10+60+300, INFO_BOARD_HEIGHT/2+CANVAS_HEIGHT-this.ENERGY_BAR_HEIGHT/2, this.ENERGY_BAR_WIDTH*percent, this.ENERGY_BAR_HEIGHT);        }
        else {
            ctx.fillStyle="white";
            ctx.strokeStyle="white";
            ctx.fillText("LV."+hero.shotType, 300, INFO_BOARD_HEIGHT/2+CANVAS_HEIGHT);
            percent = (hero.energy - ENERGY_LIMIT[hero.shotType])/(ENERGY_LIMIT[hero.shotType+1]-ENERGY_LIMIT[hero.shotType]);
            ctx.strokeRect(10+60+300, INFO_BOARD_HEIGHT/2+CANVAS_HEIGHT-this.ENERGY_BAR_HEIGHT/2, this.ENERGY_BAR_WIDTH, this.ENERGY_BAR_HEIGHT);
            ctx.fillRect(10+60+300, INFO_BOARD_HEIGHT/2+CANVAS_HEIGHT-this.ENERGY_BAR_HEIGHT/2, this.ENERGY_BAR_WIDTH*percent, this.ENERGY_BAR_HEIGHT);
        }

        //treasure cnt
        ctx.fillStyle="white";
        ctx.fillText("B:"+treasureCnt, 600, INFO_BOARD_HEIGHT/2+CANVAS_HEIGHT);

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
    enemyCollection.draw();
    treasureCollection.draw();
    laserCollection.draw();
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
        var hasTreasure = false;
        var itv2=now-lastTreasureTime;
        if(itv2>=TREASURE_ITV) {
            lastTreasureTime = now;
            hasTreasure = true;
        }
        enemyCollection.addElement(new Enemy(st, Math.floor(rand(1,10)), hasTreasure));
    }
    enemyCollection.update();
    enemyCollection.calCollisionWithHero();
    enemyCollection.dropDead();

    treasureCollection.calEat();
    treasureCollection.update();

    infoBoard.update();
    if(hero.hp<0) currentPage = 2;

    if(enemyProductItv<=ENEMY_PRODUCT_ITV_LIMIT)enemyProductItv=ENEMY_PRODUCT_ITV_LIMIT;
    else {
        if(hero.isSuperLaserNow) enemyProductItv+=0.12;
        else enemyProductItv-=0.2;
    }
    //console.log(hero.laserShotInterval);
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
    if(currentPage==1) {
        requestAnimationFrame(timeOut);
        //setTimeout(timeOut, FRAME_SPEED);
    }
    else {
        showGameOver();
    }
}
function gameStart() {
    currentPage = 1;
    hero = new Hero();
    treasureCnt = 0;
    laserCollection = new LaserCollection();
    enemyCollection = new EnemyCollection();
    treasureCollection = new TreasureCollection();
    infoBoard = new InfoBoard();
    buttonCollection = new ButtonCollection();
    isKeyDownLeft = false;
    isKeyDownRight = false;
    isKeyDownUp = false;
    isKeyDownDown = false;
    isShooting = false;
    lastShotTime = +new Date();
    mousePos = new Victor(0,0);
    lastEnemyProductTime = +new Date();
    lastTreasureTime = +new Date();
    enemyProductItv = 1000; //ms
    timeOut();
}
function _showWelcomeInterface() {
    ctx.save();
    ctx.fillStyle = "rgba(0,0,0)";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.fillStyle = "white";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.font = "105pt Arial";
    ctx.fillText("BB BOMB",canvas.width/2, canvas.height/2-130);

    buttonCollection.draw();
    ctx.restore();

    if(currentPage==0)requestAnimationFrame(_showWelcomeInterface);
}
function showWelcomeInterface() {
    currentPage = 0;
    buttonCollection = new ButtonCollection();
    var BUTTON_HEIGHT = 50,
        BUTTON_WIDTH = 150;
    var buttonStart = new Button(new Victor(canvas.width/2-BUTTON_WIDTH/2, canvas.height/2+10), BUTTON_WIDTH, BUTTON_HEIGHT, "START");
    var buttonHelp = new Button(new Victor(canvas.width/2-BUTTON_WIDTH/2, canvas.height/2+BUTTON_HEIGHT+35), BUTTON_WIDTH, BUTTON_HEIGHT, "HELP");
    buttonStart.onClick = gameStart;
    buttonHelp.onClick = showHelpInterface;
    buttonCollection.addElement(buttonStart);
    buttonCollection.addElement(buttonHelp);
    _showWelcomeInterface();
}
function _showGameOver() {
    ctx.save();

    ctx.fillStyle="black";
    ctx.fillRect(0,0,canvas.width,canvas.height);

    ctx.fillStyle="white";
    ctx.font="75pt Arial";
    ctx.textAlign="center";
    ctx.textBaseline="middle";
    ctx.fillText("GAME OVER!",canvas.width/2,canvas.height/2-100);

    ctx.font="25pt Arial";
    ctx.fillText("SCORE:"+infoBoard.score.toFixed(0), canvas.width/2, canvas.height/2);

    buttonCollection.draw();

    ctx.restore();
    if(currentPage==2)requestAnimationFrame(_showGameOver);
}
function showGameOver() {
    currentPage = 2;
    var BUTTON_HEIGHT = 50,
        BUTTON_WIDTH = 150;
    buttonCollection = new ButtonCollection();
    var buttonRestart = new Button(new Victor(canvas.width/2-BUTTON_WIDTH-20, canvas.height/2+55), BUTTON_WIDTH, BUTTON_HEIGHT, "RESTART");
    var buttonBack = new Button(new Victor(canvas.width/2+20, canvas.height/2+55), BUTTON_WIDTH, BUTTON_HEIGHT, "BACK");
    buttonRestart.onClick = gameStart;
    buttonBack.onClick = showWelcomeInterface;
    buttonCollection.addElement(buttonRestart);
    buttonCollection.addElement(buttonBack);
    _showGameOver();
}
function _showHelpInterface() {
    ctx.save();

    ctx.fillStyle="black";
    ctx.fillRect(0,0,canvas.width,canvas.height);

    ctx.fillStyle="white";
    ctx.font="25pt Arial";
    ctx.textAlign="center";
    ctx.textBaseline="middle";
    var y = 250, lineHeight=75;
    ctx.fillText("W S A D: MOVE",canvas.width/2,y); y+=lineHeight;
    ctx.fillText("MOUSE: SHOT",canvas.width/2,y); y+=lineHeight;
    ctx.fillText("SPACE: SUPER LASER",canvas.width/2,y); y+=lineHeight;

    buttonCollection.draw();

    ctx.restore();
    if(currentPage==3)requestAnimationFrame(_showHelpInterface);
}
function showHelpInterface() {
    currentPage = 3;
    var BUTTON_HEIGHT = 50,
        BUTTON_WIDTH = 150;
    buttonCollection = new ButtonCollection();
    var buttonBack = new Button(new Victor(canvas.width/2-BUTTON_WIDTH/2, canvas.height/2+85), BUTTON_WIDTH, BUTTON_HEIGHT, "BACK");
    buttonBack.onClick = showWelcomeInterface;
    buttonCollection.addElement(buttonBack);
    _showHelpInterface();
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
    if(event.keyCode==32) {//space
        if (treasureCnt > 0) {
            treasureCnt--;
            hero.superLaser();
        }
    }
    // if(event.keyCode>=49 && event.keyCode<=57) { //switch shot type
    //     hero.changeShotType(event.keyCode-49+1);
    // }
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
    buttonCollection.calClick();
};
canvas.onmouseup = function (event) {
    isShooting = false;
};
canvas.onmousemove = function (event) {
    mousePos = new Victor(event.offsetX, event.offsetY);
    buttonCollection.update(event.offsetX, event.offsetY);
};
//Init
ctx.fillRect(0, 0, canvas.width, CANVAS_HEIGHT);
ctx.strokeStyle = "white";
//timeOut();
showWelcomeInterface();