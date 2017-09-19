var webSocket;
var playingSounds;
var playingSoundVolumes;
var volumeMultiplier = 1;

var sHost;
var sID;

function setup() {		
	this.playingSounds = new Map;
	this.playingSoundVolumes = new Map;
	
	this.soundManager.setup({
		url: "swf/",
		debugMode: false,
		preferFlash: true
	});
}

function createSound(srcID, path, baseVolume, basePan) {
	this.soundManager.createSound({
		id: srcID,
		
		onload: function() {
			var packetSync = {};
			packetSync["pID"] = 3;
			packetSync["srcID"] = srcID;
									
			sendMessage(JSON.stringify(packetSync));
		},
		
		onplay: function() {
			playingSounds.put(srcID, this);
			playingSoundVolumes.put(srcID, baseVolume);
		},
		
		onfinish: function() {
			playingSounds.remove(srcID);
			playingSoundVolumes.remove(srcID);
			
			stopN(srcID);
		},
		
		url: "sounds/" + path,
		volume: baseVolume,
		pan: basePan,
		autoPlay: false,
		stream: true
	});
}
            
function openSocket(){
    if(this.webSocket !== undefined && this.webSocket.readyState !== this.WebSocket.CLOSED){
		return;
    }
  
    this.webSocket = new WebSocket("ws://localhost:9001");
    this.webSocket.onopen = function(event){
		if(event.data === undefined) {
            return;
		}
    };

    this.webSocket.onmessage = function(event){
		handleMessage(event.data);
    };

    this.webSocket.onclose = function(event){
		for(var i = 0; i++ < playingSounds.size; playingSounds.next()) {
			stopN(playingSounds.key());
		}
		
		soundManager.reset();
    };
}        

function closeSocket(){
    this.webSocket.close();
}

function sendMessage(message){
    this.webSocket.send(message);
}

function handleMessage(message) {
	json = JSON.parse(message);
	
	if(json.pID == 0) {
		this.sHost = json.sHost;
		this.sID = json.sID;
		
		var packetConnect = {};
		packetConnect["pID"] = 0;
		packetConnect["sHost"] = this.sHost;
		packetConnect["sID"] = this.sID;
						
		this.sendMessage(JSON.stringify(packetConnect));
	} else if(json.pID == 1) {
		if(json.sHost == this.sHost && json.sID == this.sID) {
			console.log("Connection astablished, verifying CID; {Session Host: " + this.sHost + ", Session ID: " + this.sID + "}");
			
			var packetParams = {};
			packetParams["pID"] = 2;
			packetParams["sHost"] = this.sHost;
			packetParams["sID"] = this.sID;
			packetParams["cid"] = getURLParams(document.location.search).cid;
			packetParams["uuid"] = getURLParams(document.location.search).uuid;
						
			this.sendMessage(JSON.stringify(packetParams));
		}
	} else if(json.pID == 2) {
		if(json.sHost == this.sHost && json.sID == this.sID) {
			this.closeSocket();
		}
	} else if(json.pID == 3) {
		console.log("CID verified; {CID: " + getURLParams(document.location.search).cid + ", UUID: " + getURLParams(document.location.search).uuid + "}");
	} else if(json.pID == 4) {
		srcID = json.srcID;
		
		if(!this.isPlaying(srcID)) {
			this.playN(srcID, json.path, json.volume, json.pan);
		}
	} else if(json.pID == 5) {
		srcID = json.srcID;
		
		if(!this.isPlaying(srcID)) {
			this.playN(srcID, json.path, json.volume, json.pan, json.begin, json.end);
		}
	} else if(json.pID == 6) {
		srcID = json.srcID;
		
		if(this.isPlaying(srcID)) {
			this.stopN(srcID);
		}
	} else if(json.pID == 7) {
		srcID = json.srcID;
		
		if(this.isPlaying(srcID)) {
			this.pauseN(srcID);
		}
	} else if(json.pID == 8) {
		srcID = json.srcID;
		
		if(this.isPlaying(srcID)) {
			this.resumeN(srcID);
		}
	} else if(json.pID == 9) {
		srcID = json.srcID;
		
		if(this.isPlaying(srcID)) {
			this.setVolumeN(srcID, json.volume);
		}
	} else if(json.pID == 10) {
		srcID = json.srcID;
		
		if(this.isPlaying(srcID)) {
			this.setPanN(srcID, json.pan);
		}
	} else if(json.pID == 11) {
		srcID = json.srcID;
		
		if(this.isPlaying(srcID)) {
			this.setVolumeN(srcID, json.volume);
			this.setPanN(srcID, json.pan);
		}
	} else if(json.pID == 12) {
		srcID = json.srcID;
		
		if(this.isPlaying(srcID)) {
			this.setPositionN(srcID, json.elapsedTime);
		}
	}
}

function playN(srcID, path, volume, pan) {
	this.createSound(srcID, path, volume * this.volumeMultiplier, pan);
	this.soundManager.play(srcID);
}

function playN(srcID, path, volume, pan, begin, end) {
	this.createSound(srcID, path, volume * this.volumeMultiplier, pan);
	
	var sound = this.soundManager.getSoundById(srcID);
	
	if(end != -1) {
		sound.play({from: begin, to: end});
	} else {
		sound.play({from: begin, to: null});
	}
}

function stopN(ID) {
	this.soundManager.destroySound(ID);
}

function pauseN(ID) {
	this.soundManager.pause(ID);
}

function resumeN(ID) {
	this.soundManager.resume(ID);
}

function setVolumeN(ID, volume) {
	this.playingSounds.get(ID).setVolume(volume * this.volumeMultiplier);
	this.playingSoundVolumes.put(ID, volume);
}

function setPanN(ID, pan) {
	this.playingSounds.get(ID).setPan(pan);
}

function setPositionN(ID, position) {
	this.playingSounds.get(ID).setPosition(position);
}

function setVolume(volume) {
	this.volumeMultiplier = volume / 100;

	for(var i = 0; i++ < this.playingSounds.size; this.playingSounds.next()) {
		this.playingSounds.value().setVolume(this.playingSoundVolumes.get(this.playingSounds.key()) * this.volumeMultiplier);
	}
}

function isPlaying(ID) {
	return this.playingSounds.contains(ID) && this.playingSounds.get(ID).playState == 1;
}