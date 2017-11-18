/**
 * Class that represents the image.
 * 
 * @author Venil Noronha
 */
var Canvas = function(options) {

	/**
	 * Options, callbacks and cached objects related to the cell.
	 */
	this.options = {
		/** Options. */
		divId: options.divId, // The canvas DIV id
		playerDivId: options.playerDivId, // The player DIV id
		mode: Mode.IDLE, // The current canvas mode
		labels: options.labels, // The available labels
		boxAreaThreshold: options.boxAreaThreshold, // The min cell area

		/** Cached objects. */
		div: $('#' + options.divId), // The canvas DIV
		playerDiv: $('#' + options.playerDivId), // The player DIV
		data: {}, // labels
		cellDim: {}, // The cell dimensions
		undoStack: [], // Items to undo
		maxUndo: 10, // Max items to undo
		labelMap: {}, // The label to label mapping
		nextLabelMap: {}, // The label to next label mapping
		isGroupSelected: false, // Whether a group of cells is selected
		groupMembers: [], // Cells of the selected group
		prevWrapperOffset: null, // The previous offset of the wrapper
		modifiedBBoxes : new Set([]), // The bounding boxes that are updated in a frame
		groupArea : [],
		
		/** Events. */
		ctrlKeyPressed: false, // Whether the ctrl key was pressed
		shiftKeyPressed: false, // Whether the shift key was pressed

		/** Callbacks. */
		prevFrameId: options.prevFrameId, // Called to get the current frame
		currentFrameId: options.currentFrameId, // Called to get the current frame
		nextFrameId: options.nextFrameId, // Called to get the current frame
		dataUpdate: options.dataUpdate, // Called when data is updated
		normalizeCell: !options.normalizeCell ? function(posDim) { return posDim; } : options.normalizeCell, // Called before creating cells
	};

	/**
	 * Initialize the canvas.
	 */
	this.init = function() {
		this._bindEvents();
		this._createLabelMaps();
	};

	/**
	 * Used for loading auto-saved data.
	 */
	this.loadData = function(data) {
		this.options.data = data;
	};

	/**
	 * Creates label mappings.
	 */
	this._createLabelMaps = function() {
		var prevLabel = this.options.labels[0];
		this.options.labelMap[prevLabel.name] = prevLabel;
		for (var i = 1; i < this.options.labels.length; i++) {
			var label = this.options.labels[i];
			this.options.labelMap[label.name] = label;
			this.options.nextLabelMap[prevLabel.name] = label;
			prevLabel = label;
		}
		this.options.nextLabelMap[prevLabel.name] = null;
	};

	/**
	 * Bind canvas events.
	 */
	this._bindEvents = function() {
		var _this = this;

		// Group deselection
		$(document)
			.on('click', 'body', function(e) {
				if (!_this.options.isGroupSelected || $(e.target).hasClass('group-wrapper-cell')
						|| ($(e.target).hasClass('overlay-cell') && _this._isCtrlKeyPressed())) {
					return;
				}
				_this.deselectGroup();
			});

		// Disable image drag
		this.options.playerDiv
			.on('dragstart', function(e) {
				return false;
			})
			.on('mousedown', function(e) {
				alert('Labels are disabled! Please enable labels to edit.');
			});

		// Handle cell creation and temporary cells
		this.options.div
			.on('mousedown', function(e) {
				if (!_this.options.isGroupSelected && !$(e.target).hasClass('overlay-cell')) {
					var offset = _this._offset();
					_this.options.cellDim['startX'] = e.pageX - offset.left;
					_this.options.cellDim['startY'] = e.pageY - offset.top;
					_this._setMode(Mode.DRAWING);
				}
			})
			.on('mouseup', function(e) {
				_this._removeTemporaryCell();
				var offset = _this._offset();
				_this.options.cellDim['endX'] = e.pageX - offset.left;
				_this.options.cellDim['endY'] = e.pageY - offset.top;
				if (!_this.options.isGroupSelected && _this._isInMode(Mode.DRAWING)
		        		&& _this.options.cellDim['startX'] != _this.options.cellDim['endX']
		        		&& _this.options.cellDim['startY'] != _this.options.cellDim['endY']) {
		        	_this._drawCell();
		        }
				_this._setMode(Mode.IDLE);
			})
			.on('mousemove', function(e) {
				if (!_this.options.isGroupSelected && _this._isInMode(Mode.DRAWING)) {
					var startX = _this.options.cellDim['startX'];
					var startY = _this.options.cellDim['startY'];
					var offset = _this._offset();
					var currX = e.pageX - offset.left;
					var currY = e.pageY - offset.top;
			        var posDim = _this._normalizeCell(startX, startY, currX, currY);
			        _this._createTemporaryCell(posDim);
				}
			});

		// Handle document events
		$(document)
			.keydown(function(e) {
				switch (e.which) {
					case 16:
						_this.options.shiftKeyPressed = true;
						break;
					case 17:
						_this.options.ctrlKeyPressed = true;
						//_this._isInMode(Mode.DRAGGING) || _this._destroyCellGroupWrapper(); /* Mode.DRAGGING check for 0,0 teleport fix */
						_this._isInMode(Mode.DRAGGING) //|| _this._createCellGroupWrapper(); /* Mode.DRAGGING check for 0,0 teleport fix */
						break;
				}
				e.preventDefault();
			})
			.keyup(function(e){
				switch (e.which) {
					case 16:
						_this.options.shiftKeyPressed = false;
						break;
					case 17:
						//_this.options.ctrlKeyPressed = false;
						//_this._isInMode(Mode.DRAGGING) || _this._createCellGroupWrapper(); /* Mode.DRAGGING check for 0,0 teleport fix */
						break;
				}
				e.preventDefault();
			});
	};

	/**
	 * Creates a new cell.
	 */
	this._drawCell = function() {
		var label = this.options.labels[0];
		var startX = this.options.cellDim['startX'];
		var startY = this.options.cellDim['startY'];
		var endX = this.options.cellDim['endX'];
		var endY = this.options.cellDim['endY'];

        var posDim = this._normalizeCell(startX, startY, endX, endY);
        if (posDim.width * posDim.height < this.options.boxAreaThreshold) {
        	alert("Tiny boxes not permitted! Please create a larger box.");
        	return;
        }
        posDim = this.options.normalizeCell(posDim); // This is a different normalizing function

        if(this._isCtrlKeyPressed()) {
        	this._createCellGroupWrapper(startX, startY, endX, endY);
        } else {
        	var cell = this._createCell(posDim, label);
        	var el = cell.render();
        	this.options.div.append(el);
        	
        	if (this.options.undoStack.length == this.options.maxUndo) {
        		this.options.undoStack.shift();
        	} 
        	this.options.undoStack.push(cell);
        }
	};

	/**
	 * Creates a new Cell object.
	 */
	this._createCell = function(posDim, label) {
        var cell = new Cell({
    		x: posDim.startX,
    		y: posDim.startY,
    		w: posDim.width,
    		h: posDim.height,
    		label: label,

    		isCanvasMode: this._callback('_isInMode'),
    		isCtrlKeyPressed: this._callback('_isCtrlKeyPressed'),
    		isShiftKeyPressed: this._callback('_isShiftKeyPressed'),
    		setCanvasMode: this._callback('_setMode'),
    		onUpdate: this._callback('_onCellUpdate'),
    		onDelete: this._callback('_onCellDelete'),
    		removeFromSelection: this._callback('_removeCellFromSelection'),
    		addToSelection: this._callback('_addCellToSelection'),
    		removeTemporaryCell: this._callback('_removeTemporaryCell'),
    		nextLabel: this._callback('_nextLabel'),
    		canvasOffset: this._callback('_offset'),
    	});
		
        // Update modifiedboxes
        if(app.options.visited[app.options.frameIndex+1] == undefined) {
        	var bbox = cell.options.x +"," +cell.options.y +"," +cell.options.w +"," +cell.options.h;
        	this.options.modifiedBBoxes.add(bbox);
        }
        return cell;
	};

	/**
	 * Normalizes cell coordinates and returns { x, y, w, h } JSON.
	 */
	this._normalizeCell = function(startX, startY, endX, endY) {
		if (endX < startX) {
			var temp = endX;
			endX = startX;
			startX = temp;
		}

		if (endY < startY) {
			var temp = endY;
			endY = startY;
			startY = temp;
		}

		var width = endX - startX;
		var height = endY - startY;

		return {
			startX: startX,
			startY: startY,
			width: width,
			height: height
		};
	};

	/**
	 * Sets up a canvas context based callback.
	 */
	this._callback = function(fnName) {
		var _this = this;
		return function() {
			return _this[fnName].apply(_this, arguments);
		};
	};

	/**
	 * Checks if the current canvas mode is the given mode.
	 */
	this._isInMode = function(mode) {
		return this.options.mode == mode;
	};

	/**
	 * Set the canvas mode.
	 */
	this._setMode = function(mode) {
		this.options.mode = mode;
	};

	/**
	 * Creates and appends a temporary highlight cell to the canvas DIV.
	 */
	this._createTemporaryCell = function(posDim) {
		var tempCell = $('.temporary-cell');
		if (tempCell.length != 1) {
			var el =
				$('<div/>')
					.addClass('overlay-cell')
					.addClass('temporary-cell')
					.css('left', posDim.startX + 'px')
					.css('top', posDim.startY + 'px')
					.css('width', posDim.width)
					.css('height', posDim.height)
					.css('position', 'absolute')
					.css('z-index', 999);
			this.options.div.append(el);
		}
		else {
			tempCell.css({
				left: posDim.startX,
				top: posDim.startY,
				width: posDim.width,
				height: posDim.height
			});
		}
	};

	/**
	 * Deletes the temporary highlight cell.
	 */
	this._removeTemporaryCell = function() {
		$('.temporary-cell').remove();
	};

	/**
	 * Returns the canvas DIV offset.
	 */
	this._offset = function() {
		return this.options.div.offset();
	};

	/**
	 * Returns <code>true</code> if ctrl is pressed, else <code>false</code>.
	 */
	this._isCtrlKeyPressed = function() {
		return this.options.ctrlKeyPressed;
	};

	/**
	 * Returns <code>true</code> if ctrl is pressed, else <code>false</code>.
	 */
	this._isShiftKeyPressed = function() {
		return this.options.shiftKeyPressed;
	};

	/**
	 * Handles cell updates.
	 */
	this._onCellUpdate = function(cell) {
		var frameId = this.options.currentFrameId();
		var currFrame = this.options.data[frameId];
		if (!currFrame) {
			this.options.data[frameId] = {};
		}
		var key = cell.options.x + ',' + cell.options.y + ',' + cell.options.w + ',' + cell.options.h;
		var state = !cell.options.label ? null : cell.options.label.name;
		if (!!state) {
			this.options.data[frameId][key] = state;
		}
		else {
			this.options.modifiedBBoxes.delete(key);
			delete this.options.data[frameId][key];
		}
		if (Object.keys(this.options.data[frameId]).length == 0) {
			delete this.options.data[frameId];
		}
		this.options.dataUpdate(this.options.data);
	};

	/**
	 * Handles cell deletes.
	 */
	this._onCellDelete = function(cell) {
		this.options.undoStack = $.grep(this.options.undoStack, function(otherCell) {
			return otherCell != cell;
		});
		this._onCellUpdate(cell);
	};

	/**
	 * Returns the next label given a name.
	 */
	this._nextLabel = function(name) {
		var nextLabel = this.options.nextLabelMap[name];
		if (!nextLabel) {
			nextLabel = this.options.labels[0];
		}
		return nextLabel;
	};

	/**
	 * Adds cell to group of selected cells.
	 */
	this._addCellToSelection = function(cell) {
		this.options.isGroupSelected = true;
		this.options.groupMembers.push(cell);
	};

	/**
	 * Removes cell from group of selected cells.
	 */
	this._removeCellFromSelection = function(cell) {
		this.options.groupMembers = $.grep(this.options.groupMembers, function(otherCell) {
			return otherCell != cell;
		});
		if (this.options.groupMembers.length == 0) {
			this.options.isGroupSelected = false;
		}
	};

	/**
	 * Creates the invisible selected cell group wrapper.
	 */
	this._createCellGroupWrapper_old = function() {
		this._destroyCellGroupWrapper();
		if (this.options.isGroupSelected) {
			var startX = Number.MAX_VALUE,
				startY = Number.MAX_VALUE,
				endX = Number.MIN_VALUE,
				endY = Number.MIN_VALUE;
			for (var i = 0; i < this.options.groupMembers.length; i++) {
				var cell = this.options.groupMembers[i].options.div;
				var offset = this._offset();
				var elOffset = cell.offset();
		        var elStartX = elOffset.left - offset.left;
		        var elStartY = elOffset.top - offset.top;
		        var elEndX = elStartX + cell.outerWidth();
		        var elEndY = elStartY + cell.outerHeight();
				if (elStartX < startX) startX = elStartX;
				if (elStartY < startY) startY = elStartY;
				if (elEndX > endX) endX = elEndX;
				if (elEndY > endY) endY = elEndY;
			}
			this._drawGroupWrapper(startX, startY, endX, endY);
		}
	};

	/**
	 * Creates the invisible selected cell group wrapper.
	 */
	this._createCellGroupWrapper = function(startX, startY, endX, endY) {
		this._destroyCellGroupWrapper();
		this.options.mode = Mode.DRAGGING;
		
		var posDim = { startX: startX, startY: startY, width: endX-startX, height: endY-startY };
		this._createTemporaryCell(posDim);
		
		var frameId = this.options.currentFrameId();
		var cellKeys = Object.keys(this.options.data[frameId]);
		for (var index = 0; index < cellKeys.length; index++) {
			var cellKey = cellKeys[index];
			var state = this.options.data[frameId][cellKey];
			var values = cellKey.split(',');
			var label = this.options.labelMap[state];
			var cell = this._createCell(posDim, label);
	        var el = cell.render();

	        this.options.groupMembers.push(cell);
			this.options.groupArea.push([startX, startY, endX, endY]);
	        this._drawGroupWrapper(startX, startY, endX, endY);
		}
	};
	
	/**
	 * Renders the group wrapper div.
	 */
	this._drawGroupWrapper = function(startX, startY, endX, endY) {
		var _this = this;
		var width = endX - startX;
		var height = endY - startY;
		var el =
			$('<div/>')
				.addClass('overlay-cell')
				.addClass('group-wrapper-cell')
				.css('left', startX + 'px')
				.css('top', startY + 'px')
				.css('width', width)
				.css('height', height)
				.css('position', 'absolute')
				.css('z-index', 999999999999);
		this.options.div.append(el);
		this._bindGroupWrapperEvents(el);
		$('.draggable-cell').draggable('disable');
	};

	/**
	 * Binds group wrapper events.
	 */
	this._bindGroupWrapperEvents_old = function(el) {
		var _this = this;
		el.on('mousedown', function(e) {
			_this._deselectGroupIfNeeded(e.pageX, e.pageY);
		});
		el.draggable({
			containment: 'parent',
			start: function() {
				_this._setMode(Mode.DRAGGING);
				_this._removeTemporaryCell(); // Remove the tiny temporary cell
				_this.options.prevWrapperOffset = $(this).offset();
			},
			drag: function() {
				_this._moveGroup($(this));
			},
			stop: function() {
				_this._moveGroup($(this));
		        setTimeout(function() {
					_this._setMode(Mode.IDLE); // Prevent immediate color switch by introducing delay 
		        }, 100);
			}
		});
	};
	
	/**
	 * Binds group wrapper events.
	 */
	this._bindGroupWrapperEvents = function(el) {
		var _this = this;
		var clickedOnCell = false;
		el.on('mousedown', function(e) {
			clickedOnCell = _this._deselectGroupIfNeeded(e.pageX, e.pageY);
		});
		el.draggable({
			containment: 'parent',
			start: function() {
				_this._setMode(Mode.DRAGGING);
				_this._removeTemporaryCell(); // Remove the tiny temporary cell
				_this.options.prevWrapperOffset = $(this).offset();
			},
			drag: function() {
				if(clickedOnCell) _this._moveGroup($(this));
			},
			stop: function() {
				_this._moveGroup($(this));
		        setTimeout(function() {
					_this._setMode(Mode.IDLE); // Prevent immediate color switch by introducing delay 
		        }, 100);
			}
		});
	};
	

	/**
	 * Deselects a group if clicked outside any cells in the group.
	 */
	this._deselectGroupIfNeeded = function(clickX, clickY) {
		clickX = clickX - this._offset().left;
		clickY = clickY - this._offset().top;
		var clickedOnCell = false;
		if(this.options.groupArea.length > 0) {
			this.options.groupArea.forEach(area => {
				if(area[0] <= clickX && area[1] <= clickY &&
						area[2] >= clickX && area[3] >= clickY) {
					clickedOnCell = true;
				} 
			});
		}
		if (!clickedOnCell) {
			this.options.groupAreas = [];
			this.deselectGroup();
		}
		return clickedOnCell;
	};

	/**
	 * Moves a group of cells at once.
	 */
	this._moveGroup = function(el) {
		var _this = this;
		var temp = el.offset();
		var xDiff = this.options.prevWrapperOffset.left - temp.left;
		var yDiff = temp.top - this.options.prevWrapperOffset.top;
		this.options.prevWrapperOffset = el.offset();
		this.options.groupMembers.forEach(cell => {
			var prevOffset = cell.options.div.offset();
			cell.options.div.offset({ left: prevOffset.left - xDiff, top: prevOffset.top + yDiff });
			cell._updatePosition();
		});
	};

	/**
	 * Deselects a group of cells.
	 */
	this.deselectGroup = function() {
		if (!this.options.isGroupSelected) {
			return;
		}
		var _this = this;
		this.options.groupMembers.forEach(cell => {
			cell.options.div.removeClass('selected-cell');
		});
		this.options.groupMembers = [];
		this._destroyCellGroupWrapper();
		setTimeout(function() {
			_this.options.isGroupSelected = false;
		}, 100);
	};

	/**
	 * Destroys the invisible selected cell group wrapper.
	 */
	this._destroyCellGroupWrapper = function() {
		$('.group-wrapper-cell').remove();
		$('.draggable-cell').draggable('enable');
	};

	/**
	 * Undoes one operation from the stack.
	 */
	this.undo = function() {
		if (this.options.undoStack.length == 0) {
			alert("Nothing to undo.");
			return;
		}

		if (confirm("Really undo?") != true)
			return;

		var cell = this.options.undoStack.pop();
		cell.delete();
	};

	/**
	 * Resets the undo stack.
	 */
	this.resetUndoStack = function() {
		this.options.undoStack = [];
	};

	/**
	 * Reloads cells labeled for the current frame.
	 */
	this.reloadState = function(clone, prevFrameId) {
		var _this = this;
		var frameId = this.options.currentFrameId();

		// Clone cells from previous frame if needed
//		if (clone) {
//			var frameCopy = $.extend(true, {}, this.options.data[prevFrameId]);
//			if (Object.keys(frameCopy).length != 0) {
//				this.options.data[frameId] = frameCopy;
//			}
//		}
//		this.options.dataUpdate(this.options.data);

		// Render cells
		this.options.div.empty();
		if (!!this.options.data && !!this.options.data[frameId]) {
			var cellKeys = Object.keys(this.options.data[frameId]);
			for (var index = 0; index < cellKeys.length; index++) {
				var cellKey = cellKeys[index];
				var state = this.options.data[frameId][cellKey];
				var values = cellKey.split(',');
				var label = this.options.labelMap[state];
				var posDim = { startX: values[0], startY: values[1], width: values[2], height: values[3] };
				var cell = this._createCell(posDim, label);
		        var el = cell.render();
		        this.options.div.append(el);
			}
		}

		// Resize overlay
		var playerOffset = this.options.playerDiv.offset();
		var firstImg = this.options.playerDiv.find('img').first();
		this.options.div.css({
			left: playerOffset.left,
			top: playerOffset.top,
			width: firstImg.width(),
			height: firstImg.height()
		});
	};

	/**
	 * Clones group selection to a new frame.
	 */
	this.clonePreviousGroupSelection = function(cloneMeta) {
		if (!this.options.isGroupSelected) {
			return;
		}

		var newGroupMembers = [];
		cloneMeta.forEach(cell => {
			this.options.div.find('.overlay-cell')
				.each(function(index, newCell) {
					var newCellObj = $(newCell).data('cellObj');
					if (newCellObj.options.x == cell.i && newCellObj.options.y == cell.j
							&& newCellObj.options.w == cell.w && newCellObj.options.h == cell.h
							&& newCellObj.options.label.name == cell.label) {
						newGroupMembers.push(newCellObj);
						newCellObj._toggleSelection();
					}
				})
		});
		this.options.groupMembers = newGroupMembers;
		this._createCellGroupWrapper();
	};

	/**
	 * Generates group selection metadata.
	 */
	this.generateCloneMeta = function() {
		var cloneMeta = [];
		this.options.groupMembers.forEach(cell => {
			cloneMeta.push({
				i: cell.options.x,
				j: cell.options.y,
				w: cell.options.w,
				h: cell.options.h,
				label: cell.options.label.name
			});
		});
		return cloneMeta;
	};
	
	this.updateNextFrame = function() {
		var newBBoxes = new Set([]);
		if(this.options.modifiedBBoxes.size > 0) {
			var frameId = this.options.currentFrameId();
			var currFrame = this.options.data[frameId];
			if (!currFrame) {
				this.options.data[frameId] = {};
			}
			var prevframeId = this.options.prevFrameId();
			this.options.modifiedBBoxes.forEach(k => {
				var key = app.getBoxPosition(k);
				if(key != null && key != undefined && this.options.data[prevframeId] != undefined) {
					this.options.data[frameId][key] = this.options.data[prevframeId][k];
					newBBoxes.add(key);
				}
			});
			this.options.dataUpdate(this.options.data);
			this.renderCells(frameId);
		}
		this.options.modifiedBBoxes = newBBoxes;
	}
	
	this.renderCells = function(frameId) {
		if (!!this.options.data && !!this.options.data[frameId]) {
			var cellKeys = Object.keys(this.options.data[frameId]);
			for (var index = 0; index < cellKeys.length; index++) {
				var cellKey = cellKeys[index];
				var state = this.options.data[frameId][cellKey];
				var values = cellKey.split(',');
				var label = this.options.labelMap[state];
				var posDim = { startX: values[0], startY: values[1], width: values[2], height: values[3] };
				var cell = this._createCell(posDim, label);
		        var el = cell.render();
		        this.options.div.append(el);
			}
		}
	}
	
	this.handlePreviousFrame = function(frameId) {
		this.options.modifiedBBoxes = new Set([]);
	}
	
};
