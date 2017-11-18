/**
 * Class the abstract the App behavior.
 * 
 * @author Venil Noronha
 */
var App = function() {

	/**
	 * Options.
	 */
	this.options = {
		config: null, // populated via API call
		video: null, // the current video meta
		frameIndex: 0, // current frame index
		visited: {}, // frames that are visited
		isPlaying: false, // whether the TV is playing
		playInterval: null, // play setInterval object
		optionName: 'Review', // Set to 'Review' because this field is only used in 'REVIEW' mode.
							  // Also, after first deploying the new review feature, a optionName is mandatory to write the review output.
		isReviewMode: false, // Whether the app is loaded in review mode
		reviewEntryTime: null, // Time of the entry being reviewed
		isSeeking: false, // Whether the video is being seeked
		numFramesLoaded: 0, // The number of images loaded
		imageLoadFailed: false, // Whether image loading failed
		canvas: null, // The canvas object
		isCopyBBoxMode: false, // Whether the bounding boxes should be predicted or copied
	};

	/**
	 * Loads the config from the server, initializes and plays the video.
	 */
	this.init = function() {
		var _this = this;
		$(document).ready(function() {
			_this.hideFrameLoader();
			_this.bindEvents();
			$.getJSON('/config', function(data) {
				_this.options.config = data;
				_this.setHelpText();
				_this.options.canvas = new Canvas({
					divId: 'overlay1',
					playerDivId: 'player1',
					labels: _this.options.config.labels,
					boxAreaThreshold: _this.options.config.boxAreaThreshold,
					currentFrameId: function() {
						return _this._generateFrameName(_this.options.frameIndex);
					},
					prevFrameId: function(){
						if(_this.options.frameIndex > 0)
							return _this._generateFrameName(_this.options.frameIndex-1);
						return null;
					},
					nextFrameId: function(){
						if(_this.options.frameIndex < _this.options.numFramesLoaded)
							return _this._generateFrameName(_this.options.frameIndex+1);
						return null;
					},
					dataUpdate: function(data) {
						console.log(JSON.stringify(data));
						_this._autoSaveData(data);
					}
				});
				_this.options.canvas.init();
				_this.loadAutoSavedData() || _this.displayMenu();
				setTimeout(function() {
					_this.playVideo();
				}, 1000);
			});
		});
	};

	/** Binds necessary browser events. */
	this.bindEvents = function() {
		var _this = this;

		// Disable default ctrl-click behavior
		document.addEventListener('contextmenu', function(e) {
			e.preventDefault();
			/** Chrome swallows the click event, so simulating it. */
			if (/chrom(e|ium)/.test(navigator.userAgent.toLowerCase())) {
				$(e.target).click();
			}
		});

		// App event handling
		$(document)
			.keydown(function(e) {
				switch (e.which) {
					case 37:
						_this.seekLeft();
						break;
					case 39:
						_this.seekRight();
						break;
				}
				e.preventDefault();
			});

		// Button click handling
		$('#copy-toggle').click(function() {  _this.toggleCopy(); });
		$('#step-backward').click(function() { _this.seekLeft(); });
		$('#play').click(function() { _this.play(); });
		$('#pause').click(function() { _this.pause(); });
		$('#stop').click(function() { _this.stop(); });
		$('#step-forward').click(function() { _this.seekRight(); });
		$('#undo').click(function() { _this.undo(); });
		$('#reset').click(function() { _this.resetData(); });
		$('#label-toggle').click(function() { _this.toggleLabels(); });
		$('#submit').click(function() { _this.submitData(); });
		$('#help').click(function() { _this.showHelp(); });
		$('.close-btn').click(function() { _this.closeHelp(); });
		$('#bbox-buffer').change(function() { _this.drawBufferedBoundingBox(); });
	};

	/**
	 * Loads previously auto-saved data at startup.
	 */
	this.loadAutoSavedData = function() {
		if (typeof(Storage) === "undefined") return false;
		var autoSavedData = localStorage.getItem("autoSavedData");
		if (!autoSavedData) return false;
		autoSavedData = JSON.parse(autoSavedData);
		var foundVideo = $.grep(this.options.config.videos, function(otherVideo) {
			return otherVideo.directory == autoSavedData.video.directory;
		});
		if (foundVideo.length == 0) {
			localStorage.removeItem("autoSavedData");
			return false;
		}
		this.loadData(autoSavedData);
		return true;
	};

	/**
	 * Helper function to load auto-saved data.
	 */
	this.loadData = function(autoSavedData) {
		this.options.video = autoSavedData.video;
		this.options.frameIndex = autoSavedData.frameIndex;
		this.options.visited = autoSavedData.visited;
		this.options.optionName = !!autoSavedData.optionName ? autoSavedData.optionName : 'Review';
		this.options.isReviewMode = autoSavedData.isReviewMode;
		this.options.reviewEntryTime = autoSavedData.reviewEntryTime;
		this.options.canvas.loadData(autoSavedData.data);
	};

	/**
	 * Auto-saves current app data to localStorage.
	 */
	this._autoSaveData = function(data) {
		if (typeof(Storage) === "undefined") {
			return;
		}
		var autoSavedData = {
			video: this.options.video,
			data: $.extend(true, {}, data),
			frameIndex: this.options.frameIndex,
			visited: this.options.visited,
			optionName: this.options.optionName,
			isReviewMode: this.options.isReviewMode,
			reviewEntryTime: this.options.reviewEntryTime
		};
		localStorage.setItem("autoSavedData", JSON.stringify(autoSavedData));
	};

	/**
	 * Deletes any auto-saved data from localStorage.
	 */
	this.resetAutoSavedData = function() {
		if (typeof(Storage) === "undefined") {
			return;
		}
		localStorage.removeItem("autoSavedData");
	};

	/**
	 * Sets help text in the help popup.
	 */
	this.setHelpText = function() {
		var numText = ['once', 'twice', 'thrice', 'a fourth time', 'a fifth time', 'a sixth time', 'a seventh time'];
		var helpText = '';
		var types = "";
		for (var i = 0; i < this.options.config.labels.length; i++) {
			var label = this.options.config.labels[i];
			helpText += 'A ' + label.colorText + ' cell like <span style="width: 20px; height: 20px; background-color: ' + label.color
					 + '; opacity: 0.5; display: inline-block; vertical-align: middle;"></span> represents ' + label.name + '.<br/>';
			if (i > 0) {
				types += ", ";
			}
			else if (i > 0 && i == this.options.config.labels.length - 1) {
				types += "and ";
			}
			types += label.name;
		}
		helpText += '<br/>';
		helpText += 'Your goal is to create relevant cells on each frame of the video, and<br/>';
		helpText += 'mark them with the ' + types + ' labels.<br/>';
		helpText += 'You can create cells by <b>click</b>ing and <b>drag</b>ging on the video.<br/>';
		var i;
		for (i = 0; i < this.options.config.labels.length; i++) {
			var label = this.options.config.labels[i];
			if (i == 0) {
				helpText += "C";
			}
			else {
				helpText += "c";
			}
			helpText += "licking on a cell " + numText[i] + " turns it " + label.colorText + ", ";
			if ((i + 1) % 2 == 0) {
				helpText += "<br/>";
			}
		}
		helpText += 'and clicking it while holding the <b>shift</b> key deletes it.<br/>';
		$('.help-text').html(helpText + $('.help-text').html());
	};

	/**
	 * Displays the initial choice menu.
	 */
	this.displayMenu = function() {
		var _this = this;

		var choice = this.generateMenu('n action', this.options.config.options, function(option) { return option.name; });
		this.options.optionName = this.options.config.options[choice - 1].name;
		this.options.isReviewMode = this.options.config.options[choice - 1].mode == 'REVIEW';

		var videos = this.options.config.videos;
		if (this.options.optionName == 'Final Review') {
			videos = this.options.config.reviewedVideos;
		}

		while (true) {
			choice = this.generateMenu(' video', videos, function(video) { return video.directory; });
			if (this.options.optionName == 'Final Review' && !videos[choice - 1].isAccessible) {
				alert("This video isn't accessible at the moment. Please upload the video, or try another video.");
			}
			else {
				break;
			}
		}
		this.options.video = videos[choice - 1];

		if (this.options.isReviewMode) {
			$.ajax({
				url: '/data/list',
				contentType: 'application/json',
				type: 'GET',
				headers: {
					'X-fileName': this.options.video.directory,
					'X-optionName': this.options.optionName
				}
			}).done(function(data) {
				var choice = _this.generateMenu('n entry to review', data, function(text) { return text; });
				var entryTime = data[choice - 1];
				_this.options.reviewEntryTime = entryTime;
				_this.loadReviewData(entryTime);
			}).fail(function() {
				alert('Some error occurred, please try again!');
			});
		}
	};

	/**
	 * Loads review data from server.
	 */
	this.loadReviewData = function(entryTime) {
		var _this = this;
		$.ajax({
			url: '/data',
			contentType: 'application/json',
			type: 'GET',
			headers: {
				'X-fileName': this.options.video.directory,
				'X-entryTime': entryTime,
				'X-optionName': this.options.optionName
			}
		}).done(function(data) {
			_this.options.canvas.loadData(JSON.parse(data));
		}).fail(function() {
			alert('Some error occurred, please try again!');
		});
	};

	/**
	 * Generates a menu.
	 */
	this.generateMenu = function(type, menuItems, mapper) {
		var menu = "Please select a" + type + ":\n";
		for (var i = 0; i < menuItems.length; i++) {
			menu += (i + 1) + ". " + mapper(menuItems[i]) + "\n";
		}
		menu += "\nEnter your choice:";
		var choice = "1";
		var choiceInt = 1;
		var failed = false;
		do {
			if (failed) {
				alert(choice + " is not a valid choice. Please try again.");
			}
			choice = prompt(menu, choice);
			choiceInt = Math.floor(Number(choice));
			failed = true;
		} while (String(choiceInt) !== choice || choiceInt < 1 || choiceInt > menuItems.length);
		return choiceInt;
	};

	/**
	 * Toggles label display mode.
	 */
	this.toggleLabels = function() {
		if ($('#label-toggle').hasClass('fa-eye-slash')) {
			$('#label-toggle').removeClass('fa-eye-slash').addClass('fa-eye').attr('title', 'Show Labels');
			$('#overlay1').hide();
		}
		else {
			$('#label-toggle').removeClass('fa-eye').addClass('fa-eye-slash').attr('title', 'Hide Labels');
			$('#overlay1').show();
		}
	};

	/**
	 * Shows help popup.
	 */
	this.showHelp = function() {
		$('#help-content, #help-content-body').show();
	};

	/**
	 * Closes help popup.
	 */
	this.closeHelp = function() {
		$('#help-content, #help-content-body').hide();
	};

	/**
	 * Undoes an operation.
	 */
	this.undo = function() {
		this.options.canvas.undo();
	};

	/**
	 * Resets and refreshes.
	 */
	this.resetData = function() {
		if (confirm("Really reset?") != true)
			return;

		this.resetAutoSavedData();
		location.reload();
	};

	/**
	 * Submits labels to server.
	 */
	this.submitData = function() {
		var _this = this;
		if (confirm("Sure to submit?") != true)
			return;

		$.ajax({
			url: this.options.isReviewMode ? '/data/review' : '/data',
			contentType: 'application/json',
			type: 'POST',
			headers: {
				'X-fileName': this.options.video.directory,
				'X-entryTime': this.options.reviewEntryTime,
				'X-optionName': this.options.optionName,
				'X-userAgent': navigator.userAgent
			},
			data: JSON.stringify(this.options.canvas.options.data)
		}).done(function() {
			$('body')
				.css({ 'text-align': 'center', 'margin-top': '50px' })
				.html('<h1 style="color: #f1c40f;">Thank you!</h1>');
			_this.resetAutoSavedData();
		}).fail(function() {
			alert('Some error occurred, please try again!');
		});
	};

	/**
	 * Plays the video at 1 FPS.
	 */
	this.play = function() {
		var _this = this;
		this.options.canvas.deselectGroup();
		this.options.canvas.resetUndoStack();
		if (!this.options.isPlaying) {
			this.options.isPlaying = true;
			$('#play').css('display', 'none');
			$('#pause').css('display', '');
			this.options.playInterval = setInterval(function() {
				_this.seekRight();
				if (_this.options.frameIndex == _this.options.video.numFrames - 1) {
					_this.pause();
				}
			}, 1000); // frame speed
		}
	};

	/**
	 * Pauses the video.
	 */
	this.pause = function() {
		this.options.canvas.deselectGroup();
		this.options.canvas.resetUndoStack();
		if (this.options.isPlaying) {
			this.options.isPlaying = false;
			$('#pause').css('display', 'none');
			$('#play').css('display', '');
			clearInterval(this.options.playInterval);
			this.options.playInterval = null;
		}
	};

	/**
	 * Stops the video and returns to frame 1.
	 */
	this.stop = function() {
		this.options.canvas.deselectGroup();
		this.options.canvas.resetUndoStack();
		this.pause();
		this.options.frameIndex = 1;
		this.seekLeft();
	};

	/**
	 * Seeks 1 frame left.
	 */
	this.seekLeft = function() {
		if (this.options.isSeeking) {
			return;
		}

		this.options.canvas.deselectGroup();
		this.options.canvas.resetUndoStack();
		this.options.frameIndex -= 1;
		if (this.options.frameIndex < 0) {
			this.options.frameIndex = 0;
		}
		else {
			this._reloadFrame();
			this._reloadCanvasState();
			this.options.canvas.handlePreviousFrame();
			this.options.visited[this.options.frameIndex] = true;
		}
		this.updateProgress();
	};

	/**
	 * Reloads the image based on current frame number.
	 */
	this._reloadFrame = function() {
		this.options.isSeeking = true;
		jQuery('.video-frame').hide();
		jQuery('#framenum-' + this.options.frameIndex).show();
		this.options.isSeeking = false;
	};
	
	/**
	 * Seeks 1 frame right.
	 */
	this.seekRight = function() {
		this.showFrameLoader();
//		$(".next-frame-loader")[0].style.display = 'block';
		var _this = this;
		setTimeout(function() {
			if (_this.options.isSeeking) {
				return;
			}
			
			_this.options.canvas.resetUndoStack();
			_this.options.frameIndex += 1;
			if (_this.options.frameIndex > _this.options.video.numFrames - 1) {
				_this.options.frameIndex = _this.options.video.numFrames - 1;
			}
			else {
				var cloneMeta = _this.options.canvas.generateCloneMeta();
				_this.options.canvas.updateNextFrame();
				_this._reloadFrame();
				_this._reloadCanvasState();
				_this.options.canvas.clonePreviousGroupSelection(cloneMeta);
				_this.options.visited[_this.options.frameIndex] = true;
			}
			_this.updateProgress();
			_this.hideFrameLoader();
//			$(".next-frame-loader")[0].style.display = 'none';
		}, 100);
	};

	/**
	 * Reloads/loads canvas state.
	 */
	this._reloadCanvasState = function() {
		var frameIndex = this.options.frameIndex;
		var clone = frameIndex > 0 && !this.options.visited[frameIndex];
		if (clone) {
			var prevFrameId = this._generateFrameName(frameIndex - 1);
		}
		this.options.canvas.reloadState(clone, prevFrameId);
	};

	/**
	 * Updates video progress.
	 */
	this.updateProgress = function() {
		var fi = this.options.frameIndex == 0 ? 0 : this.options.frameIndex + 1;
		var progress = (fi / this.options.video.numFrames) * 100;
		$('.progress').html(Math.floor(progress) + ' %');
	};

	/**
	 * Removes the loader animation.
	 */
	this.removeLoader = function() {
		$('.loader').css('display', 'none');
	};

	/**
	 * Callback to count number of loaded images.
	 */
	this.imageLoaded = function(imageNum) {
		console.log('Loaded image: ' + imageNum);
		this.options.numFramesLoaded++;
		if (this.options.numFramesLoaded == this.options.video.numFrames) {
			this.removeLoader();
			$('.player-container').css('display', '');
			this.options.isReviewMode && this.markAllVisited();
			this._reloadCanvasState();
			this.options.visited[this.options.frameIndex] = true;
			if (this.options.frameIndex != 0) {
				this._reloadFrame();
				this.updateProgress();
			}
		}
	};

	/**
	 * Callback to notify image load failure.
	 */
	this.imageFailed = function(imageNum) {
		if (!this.options.imageLoadFailed) {
			console.log('Failed to load the video. Please refresh the page to try again.');
			this.options.imageLoadFailed = true;
		}
		console.log('Failed to load image: ' + imageNum);
	};

	/**
	 * Helper function to generate frame names.
	 */
	this.padDigits = function(number, digits) {
	    return Array(Math.max(digits - String(number).length + 1, 0)).join(0) + number;
	};

	/**
	 * Creates a new Image for a particular frame.
	 */
	this.createImage = function(directory, i) {
		var _this = this;
		var img = new Image();
		img.setAttribute('id', 'framenum-' + i);
		img.setAttribute('data-framenum', i);
		img.setAttribute('class', 'video-frame');
	    img.onload = function() { _this.imageLoaded(i); };
	    img.onerror = function() { _this.imageFailed(i); };
	    img.src = '/input/' + directory + '/' + directory + '_' + this.padDigits(i, 10) + '.jpg';
	    if (i > 0) {
	    	img.style.display = 'none';
	    }
	    return img;
	};

	/**
	 * Plays the video.
	 */
	this.playVideo = function() {
		var _this = this;
		var viewType = this.options.isReviewMode ? this.options.optionName : 'Label';
		$('#player1-title').html(viewType + ': ' + this.options.video.directory);
		var video = $('#player1').get(0);
		video.innerHTML = '';
		for (var i = 0; i < this.options.video.numFrames; i++) {
			var img = this.createImage(this.options.video.directory, i);
			video.append(img);
		}
	};

	/**
	 * Marks all frames as visited.
	 */
	this.markAllVisited = function() {
		for (var frameIndex = 0; frameIndex < this.options.video.numFrames; frameIndex++) {
			this.options.visited[frameIndex] = true;
		}
	};

	/**
	 * Generates frame name from number.
	 */
	this._generateFrameName = function(frameNum) {
		return this.options.video.directory + '_' + this.padDigits(frameNum, 10) + '.jpg';
	};
	
	/**
	 * Toggles between copy mode and predict bounding boxes 
	 */
	this.toggleCopy = function() {
		this.isCopyBBoxMode = !this.isCopyBBoxMode;
		if(this.isCopyBBoxMode) {
			$('#copy-toggle')[0].style.color = "white";
		} else {
			$('#copy-toggle')[0].style.color = "#34495e";
		}
	};
	
	
	/**
	 * Sends the previous and current frames to calculate the new position of the bounding box.
	 */
	this.getBoxPosition = function(selectedBounds) {
		var newPosition = selectedBounds;
		if (this.options.frameIndex > 0 && !this.isCopyBBoxMode) {
			var directory = this.options.video.directory;
			var prevFile = directory + "/" + directory + '_' + this.padDigits(this.options.frameIndex-1, 10) + '.jpg';
			var currFile = directory + "/" + directory + '_' + this.padDigits(this.options.frameIndex, 10) + '.jpg';
			var bufferSize = $('#bbox-buffer')[0].value;
			
			var imgData = {
					'prevFilename': prevFile,
					'currFilename': currFile,
					'bounds': selectedBounds,
					'bufferSize': bufferSize
			}
			$.ajax({
				url: '/data/box',
				contentType: 'application/json',
				type: 'GET',
				headers: imgData,
				async: false
			}).done(function(data) {
				if(data == null || data == undefined) {
					// Not processed due to larger box area
					data = selectedBounds;
				}
				newPosition = data.toString().replace("[","").replace("]","").replace(/\ /g, '');
				
				//Handle boundary predictions
				var width = parseInt($("#overlay1").width());
				var height = parseInt($("#overlay1").height());
				var x = parseInt(newPosition.split(',')[0]);
				var y = parseInt(newPosition.split(',')[1]);
				var w = parseInt(newPosition.split(',')[2]);
				var h = parseInt(newPosition.split(',')[3]);
				
				x1 = (x < 0) ? 0 : x;
				y1 = (y < 0) ? 0 : y;
				w1 = (x+w >= width) ? width - x : w;
				h1 = (y+h >= height) ? height - y : h;
				
				newPosition = x1 + "," + y1 + "," + w1 + "," + h1;
				
			}).fail(function(error) {
				alert('Some error occurred, please try again!');
			});
		}
		return newPosition;
	};
	
	this.showFrameLoader = function(){
		$(".next-frame-loader")[0].style.display = 'block';
	}
	this.hideFrameLoader = function(){
		$(".next-frame-loader")[0].style.display = 'none';
	}
	
	this.drawBufferedBoundingBox = function() {
		var canvasOptions = this.options.canvas.options;
		var frameId = canvasOptions.currentFrameId();
		if (!!canvasOptions.data && !!canvasOptions.data[frameId]) {
			var cellKeys = Object.keys(canvasOptions.data[frameId]);
			for (var index = 0; index < cellKeys.length; index++) {
				var cellKey = cellKeys[index];
				var values = cellKey.split(',');
				
				var bufferSize = parseInt($('#bbox-buffer')[0].value);
				var x = parseInt(values[0]);
				var y = parseInt(values[1]);
				var w = parseInt(values[2]);
				var h = parseInt(values[3]);
				
				var width = parseInt($("#overlay1").width());
				var height = parseInt($("#overlay1").height());
				var  x1 = x, y1 = y, x2 = x + w, y2 = y + h;
				x1 = Math.max(x1 - bufferSize, 0);
				y1 = Math.max(y1 - bufferSize, 0);
				x2 = Math.min(x2 + bufferSize, width-1);
				y2 = Math.min(y2 + bufferSize, height-1);

				var wBuff = x2 - x1;
				var hBuff = y2 - y1;
				
		        var el = $('<div/>')
		        		.addClass('overlay-buffer')
						.css('left', x1 + 'px')
						.css('top', y1 + 'px')
						.css('width', wBuff)
						.css('height', hBuff)
						.css('z-index', 888)
						.css('opacity', 0.25)
						.css('background-color', '#7FFF00')
						.css('position', 'absolute');
		        canvasOptions.div.append(el);
			}
		}
		
		setTimeout(function(){
			var bufferCells = $(".overlay-buffer");
			if(!!bufferCells) {
				for(var i=0; i < bufferCells.length; i++){
					bufferCells[i].remove();
				}
			}
		}, 800);
		$('#bbox-buffer').blur();
	}
};

var app = new App();
app.init();
