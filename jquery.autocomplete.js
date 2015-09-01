/*
 * jQuery Autocomplete plugin 1.2.2
 *
 * Copyright (c) 2009 Jörn Zaefferer
 *
 * Dual licensed under the MIT and GPL licenses:
 *   http://www.opensource.org/licenses/mit-license.php
 *   http://www.gnu.org/licenses/gpl.html
 *
 * With small modifications by Alfonso Gómez-Arzola.
 * See changelog for details.
 *
 */

; (function ($) {

	$.fn.extend({
		autocomplete: function (urlOrData, options) {
			var isUrl = typeof urlOrData == "string";
			options = $.extend({}, $.Autocompleter.defaults, {
				url: isUrl ? urlOrData : null,
				data: isUrl ? null : urlOrData,
				delay: isUrl ? $.Autocompleter.defaults.delay : 10,
				max: options && !options.scroll ? 10 : 150,
				hideOnDelPress: true
			}, options);

			// if highlight is set to false, replace it with a do-nothing function
			options.highlight = options.highlight || function (value) { return value; };

			// if the formatMatch option is not specified, then use formatItem for backwards compatibility
			options.formatMatch = options.formatMatch || options.formatItem;

			return this.each(function () {
				new $.Autocompleter(this, options);
			});
		},
		result: function (handler) {
			return this.bind("result.autocomplete", handler);
		},
		search: function (handler) {
			return this.trigger("search.autocomplete", [handler]);
		},
		flushCache: function () {
			return this.trigger("flushCache.autocomplete");
		},
		setOptions: function (options) {
			return this.trigger("setOptions.autocomplete", [options]);
		},
		unautocomplete: function () {
			return this.trigger("unautocomplete.autocomplete");
		}
	});

	$.Autocompleter = function (input, options) {

		var KEY = {
			UP: 38,
			DOWN: 40,
			DEL: 46,
			TAB: 9,
			RETURN: 13,
			ESC: 27,
			COMMA: 188,
			PAGEUP: 33,
			PAGEDOWN: 34,
			BACKSPACE: 8
		};

		var globalFailure = null;
		if (options.failure != null && typeof options.failure == "function") {
			globalFailure = options.failure;
		}

		// Create $ object for input element
		var $input = $(input).attr("autocomplete", "off").addClass(options.inputClass);

		var timeout;
		var previousValue = "";
		var cache = $.Autocompleter.Cache(options);
		var hasFocus = 0;
		var lastKeyPressCode;
		var config = {
			mouseDownOnSelect: false
		};
		var select = $.Autocompleter.Select(options, input, selectCurrent, config);

		var blockSubmit;

		$input.bind("keydown.autocomplete", function (event) {
			// a keypress means the input has focus
			// avoids issue where input had focus before the autocomplete was applied
			hasFocus = 1;
			// track last key pressed
			lastKeyPressCode = event.keyCode;
			switch (event.keyCode) {

				case KEY.UP:
					if (select.visible()) {
						event.preventDefault();
						select.prev();
					} else {
						onChange(0, true);
					}
					break;

				case KEY.DOWN:
					if (select.visible()) {
						event.preventDefault();
						select.next();
					} else {
						onChange(0, true);
					}
					break;

				case KEY.PAGEUP:
					if (select.visible()) {
						event.preventDefault();
						select.pageUp();
					} else {
						onChange(0, true);
					}
					break;

				case KEY.PAGEDOWN:
					if (select.visible()) {
						event.preventDefault();
						select.pageDown();
					} else {
						onChange(0, true);
					}
					break;

					// matches also semicolon
				case options.multiple && $.trim(options.multipleSeparator) == "," && KEY.COMMA:
				case KEY.TAB:
				case KEY.RETURN:
					if (selectCurrent()) {
						// stop default to prevent a form submit, Opera needs special handling
						//event.preventDefault();
						//blockSubmit = true;
						return;// false;
					}
					break;

				case KEY.ESC:
					select.hide();
					break;

				default:
					clearTimeout(timeout);
					timeout = setTimeout(onChange, options.delay);
					break;
			}
		}).bind('focus.autocomplete', function () {
			// track whether the field has focus, we shouldn't process any
			// results if the field no longer has focus
			hasFocus++;
		}).bind('blur.autocomplete', function () {
			hasFocus = 0;
			
			if (!config.mouseDownOnSelect && !(options.preventHide && options.preventHide())) {
				hideResults();
				if (options.abandoned && $input.val() != '')
					options.abandoned();
			}
		}).bind('click.autocomplete', function () {
			// show select when clicking in a focused field
			// but if clickFire is true, don't require field
			// to be focused to begin with; just show select
			if (options.clickFire) {
				if (!select.visible()) {
					onChange(0, true);
				}
			} else {
				if (hasFocus++ > 1 && !select.visible()) {
					onChange(0, true);
				}
			}
		}).bind("search.autocomplete", function () {
			// TODO why not just specifying both arguments?
			var fn = (arguments.length > 1) ? arguments[1] : null;
			function findValueCallback(q, data) {
				var result;
				if (data && data.length) {
					for (var i = 0; i < data.length; i++) {
						if (data[i].result.toLowerCase() == q.toLowerCase()) {
							result = data[i];
							break;
						}
					}
				}
				if (typeof fn == "function") fn(result);
				else $input.trigger("result", result && [result.data, result.value]);
			}
			$.each(trimWords($input.val()), function (i, value) {
				request(value, findValueCallback, findValueCallback);
			});
		}).bind("flushCache.autocomplete", function () {
			cache.flush();
		}).bind("setOptions.autocomplete", function () {
			$.extend(true, options, arguments[1]);
			// if we've updated the data, repopulate
			if ("data" in arguments[1])
				cache.populate();
		}).bind("unautocomplete.autocomplete", function () {
			select.unbind();
			$input.unbind('.autocomplete');
			$(input.form).unbind(".autocomplete");
		});


		function selectCurrent() {
			var selectPosition = select.currentPos();
			var selected = select.selected();

			if (!selected)
				return false;

			var v = selected.result;
			previousValue = v;

			if (options.multiple) {
				var words = trimWords($input.val());
				if (words.length > 1) {
					var seperator = options.multipleSeparator.length;
					var cursorAt = $(input).selection().start;
					var wordAt, progress = 0;
					$.each(words, function (i, word) {
						progress += word.length;
						if (cursorAt <= progress) {
							wordAt = i;
							return false;
						}
						progress += seperator;
					});
					words[wordAt] = v;
					// TODO this should set the cursor to the right position, but it gets overriden somewhere
					//$.Autocompleter.Selection(input, progress + seperator, progress + seperator);
					v = words.join(options.multipleSeparator);
				}
				v += options.multipleSeparator;
			}

			var searchText = $input.val();

			$input.val(v);
			
			hideResultsNow(false);
			$input.trigger("result", [selected.data, selected.value, searchText, select.itemCount(), selectPosition]);
			return true;
		}

		function onChange(crap, skipPrevCheck) {
			if (lastKeyPressCode == KEY.DEL && options.hideOnDelPress) {
				select.hide();
				return;
			}

			var currentValue = $input.val();

			previousValue = currentValue;

			currentValue = lastWord(currentValue);
			if (currentValue.length >= options.minChars) {
				$input.addClass(options.loadingClass);
				if (!options.matchCase)
					currentValue = currentValue.toLowerCase();
				request(currentValue, receiveData, function () {
					hideResultsNow(true);
				});
			} else {
				stopLoading();
				select.hide();
			}

			resize();
		};

		function trimWords(value) {
			if (!value)
				return [""];
			if (!options.multiple)
				return [$.trim(value)];
			return $.map(value.split(options.multipleSeparator), function (word) {
				return $.trim(value).length ? $.trim(word) : null;
			});
		}

		function lastWord(value) {
			if (!options.multiple)
				return value;
			var words = trimWords(value);
			if (words.length == 1)
				return words[0];
			var cursorAt = $(input).selection().start;
			if (cursorAt == value.length) {
				words = trimWords(value);
			} else {
				words = trimWords(value.replace(value.substring(cursorAt), ""));
			}
			return words[words.length - 1];
		}

		// fills in the input box w/the first match (assumed to be the best match)
		// q: the term entered
		// sValue: the first matching result
		function autoFill(q, sValue) {
			// autofill in the complete box w/the first match as long as the user hasn't entered in more data
			// if the last user key pressed was backspace, don't autofill
			if (options.autoFill && (lastWord($input.val()).toLowerCase() == q.toLowerCase()) && lastKeyPressCode != KEY.BACKSPACE) {
				// fill in the value (keep the case the user has typed)
				$input.val($input.val() + sValue.substring(lastWord(previousValue).length));
				// select the portion of the value not typed by the user (so the next character will erase)
				$(input).selection(previousValue.length, previousValue.length + sValue.length);
			}
		};

		function hideResults() {
			clearTimeout(timeout);
			timeout = setTimeout(function () {
				hideResultsNow(false);
			}, 200);
		};

		function hideResultsNow(showNoResults) {
			if (showNoResults) {
				select.tryShowNoResults();
			} else {
				select.hide();
			}

			clearTimeout(timeout);
			stopLoading();
			if (options.mustMatch) {
				// call search and run callback
				$input.search(
					function (result) {
						// if no value found, clear the input box
						if (!result) {
							if (options.multiple) {
								var words = trimWords($input.val()).slice(0, -1);
								$input.val(words.join(options.multipleSeparator) + (words.length ? options.multipleSeparator : ""));
							}
							else {
								$input.val("");
								$input.trigger("result", null);
							}
						}
					}
				);
			}
		};

		$input[0].hideResultsNow = hideResultsNow;

		function receiveData(q, data) {
			if (data && data.length && hasFocus) {
				stopLoading();
				select.display(data, q);
				autoFill(q, data[0].value);
				select.show();
			} else {
				hideResultsNow(true);
			}
		};


		function request(term, success, failure) {
			if (!options.matchCase)
				term = term.toLowerCase();
			
			if (options.formatInput) {
				term = options.formatInput(term);
			}

			var data = cache.load(term);
			// recieve the cached data
			if (data && data.length) {
				success(term, data);
				// if an AJAX url has been supplied, try loading the data now
			} else if ((typeof options.url == "string") && (options.url.length > 0)) {

				var extraParams = {
					timestamp: +new Date()
				};
				$.each(options.extraParams, function (key, param) {
					extraParams[key] = typeof param == "function" ? param() : param;
				});

				$.ajax({
					// try to leverage ajaxQueue plugin to abort previous requests
					mode: "abort",
					// limit abortion to this input
					port: "autocomplete" + input.name,
					dataType: options.dataType,
					url: options.url,
					data: $.extend({
						q: lastWord(term),
						limit: options.max
					}, extraParams),
					success: function (data) {
						var parsed = options.parse && options.parse(data) || parse(data);
						cache.add(term, parsed);
						success(term, parsed);
					}
				});
			} else {
				// if we have a failure, we need to empty the list -- this prevents the the [TAB] key from selecting the last successful match
				select.emptyList();
				if (globalFailure != null) {
					globalFailure();
				}
				else {
					failure(term);
				}
			}
		};

		function parse(data) {
			var parsed = [];
			var rows = data.split("\n");
			for (var i = 0; i < rows.length; i++) {
				var row = $.trim(rows[i]);
				if (row) {
					row = row.split("|");
					parsed[parsed.length] = {
						data: row,
						value: row[0],
						result: options.formatResult && options.formatResult(row, row[0]) || row[0]
					};
				}
			}
			return parsed;
		};

		function stopLoading() {
			$input.removeClass(options.loadingClass);
		};

		function resize() {
			var $searchResults = $(".search_results");

			if ($searchResults.length == 0)
				return;

			var bottom = $searchResults.position().top + $searchResults.height();

			if (bottom == $(window).height())
				$searchResults.addClass("overflow");
			else
				$searchResults.removeClass("overflow");
		}
	};

	$.Autocompleter.defaults = {
		inputClass: "ac_input",
		resultsClass: "ac_results",
		loadingClass: "ac_loading",
		minChars: 1,
		delay: 400,
		matchCase: false,
		matchSubset: true,
		matchContains: false,
		cacheLength: 100,
		max: 1000,
		mustMatch: false,
		extraParams: {},
		selectFirst: true,
		formatItem: function (row) { return row[0]; },
		formatMatch: null,
		autoFill: false,
		width: 0,
		multiple: false,
		multipleSeparator: " ",
		inputFocus: true,
		clickFire: false,
		highlight: function (value, term) {
			return value.replace(new RegExp("(?![^&;]+;)(?!<[^<>]*)(" + term.replace(/([\^\$\(\)\[\]\{\}\*\.\+\?\|\\])/gi, "\\$1") + ")(?![^<>]*>)(?![^&;]+;)", "gi"), "<strong>$1</strong>");
		},
		scroll: true,
		scrollHeight: function () { return 180; },
		scrollJumpPosition: true
	};

	$.Autocompleter.Cache = function (options) {

		var data = {};
		var length = 0;

		function matchSubset(s, terms) {
			if (!options.matchCase)
				s = s.toLowerCase();

			var pos = 9999;

			for (var i = 0; i < terms.length; i++) {
				var currentPos = s.indexOf(terms[i]);
				if (currentPos == -1)
					return false;
				else if (currentPos < pos)
					pos = currentPos;
			}

			return pos;
		};

		function add(q, value) {
			if (length > options.cacheLength) {
				flush();
			}
			if (!data[q]) {
				length++;
			}
			data[q] = value;
		}

		function populate() {
			if (!options.data) return false;
			// track the matches
			var stMatchSets = {},
				nullData = 0;

			// no url was specified, we need to adjust the cache length to make sure it fits the local data store
			if (!options.url) options.cacheLength = 1;

			// track all options for minChars = 0
			stMatchSets[""] = [];

			// loop through the array and create a lookup structure
			for (var i = 0, ol = options.data.length; i < ol; i++) {
				var rawValue = options.data[i];
				// if rawValue is a string, make an array otherwise just reference the array
				rawValue = (typeof rawValue == "string") ? [rawValue] : rawValue;

				var value = options.formatMatch(rawValue, i + 1, options.data.length);
				if (typeof (value) === 'undefined' || value === false || value == null)
					continue;

				var firstChar = value.charAt(0).toLowerCase();
				// if no lookup array for this character exists, look it up now
				if (!stMatchSets[firstChar])
					stMatchSets[firstChar] = [];

				// if the match is a string
				var row = {
					value: value,
					data: rawValue,
					result: options.formatResult && options.formatResult(rawValue) || value
				};

				// push the current match into the set list
				stMatchSets[firstChar].push(row);

				// keep track of minChars zero items
				if (nullData++ < options.max) {
					stMatchSets[""].push(row);
				}
			};

			// add the data items to the cache
			$.each(stMatchSets, function (i, value) {
				// increase the cache size
				options.cacheLength++;
				// add to the cache
				add(i, value);
			});
		}

		// populate any existing data
		setTimeout(populate, 25);

		function flush() {
			data = {};
			length = 0;
		}
		
		return {
			flush: flush,
			add: add,
			populate: populate,
			load: function (q) {
				if (!options.cacheLength || !length)
					return null;

				var terms = q.split(' ');
				/*
				 * if dealing w/local data and matchContains than we must make sure
				 * to loop through all the data collections looking for matches
				 */
				if (!options.url && options.matchContains) {
					// track all matches
					var csub = [];
					// loop through all the data grids for matches
					for (var k in data) {
						// don't search through the stMatchSets[""] (minChars: 0) cache
						// this prevents duplicates
						if (k.length > 0) {
							var c = data[k];
							$.each(c, function (i, x) {
								// if we've got a match, add it to the array
								var match = matchSubset(x.value, terms);
								if (match !== false) {
									csub.push({
										item: x,
										pos: match
									});
								}
							});
						}
					}
					if (options.sort)
						csub.sort(options.sort);
					else {
						csub.sort(function(a, b) {
							if (a.pos < b.pos)
								return -1;
							else if (a.pos > b.pos)
								return 1;
							else
								return 0;
						});
					}

					var results = [];
					for (var i = 0; i < csub.length; i++)
						results.push(csub[i].item);
					
					return results;
				} else
					// if the exact item exists, use it
					if (data[q]) {
						return data[q];
					} else
						if (options.matchSubset) {
							for (var i = q.length - 1; i >= options.minChars; i--) {
								var c = data[q.substr(0, i)];
								if (c) {
									var csub = [];
									$.each(c, function (i, x) {
										var match = matchSubset(x.value, terms);
										if (match !== false) {
											csub[csub.length] = x;
										}
									});
									return csub;
								}
							}
						}
				return null;
			}
		};
	};

	$.Autocompleter.Select = function (options, input, select, config) {
		var CLASSES = {
			ACTIVE: "ac_over"
		};

		var listItems,
			active = -1,
			data,
			term = "",
			needsInit = true,
			element,
			list,
			$noResults;

		// Create results
		function init() {
			if (!needsInit)
				return;
			element = $("<div/>")
			.hide()
			.addClass(options.resultsClass)
			.appendTo((options.searchResultsElement || options.container) || document.body)
			.hover(function (event) {
				// Browsers except FF do not fire mouseup event on scrollbars, resulting in mouseDownOnSelect remaining true, and results list not always hiding.
				if ($(this).is(":visible")) {
					input.focus();
				}
				config.mouseDownOnSelect = false;
			})
			.scroll(function () {
				var that = this;

				// IE loses focus on input box when scrolling which causes the search results to hide
				input.focus();
			});

			if(options.position != 'auto')
				element.css('position', 'absolute');

			$(window).resize(function() {
				setLocation();
			}).scroll(function () {
				setLocation();
			});

			list = $("<ul/>").appendTo(element).mouseover(function (event) {
				if (target(event).nodeName && target(event).nodeName.toUpperCase() == 'LI') {
					active = $("li", list).removeClass(CLASSES.ACTIVE).index(target(event));
					$(target(event)).addClass(CLASSES.ACTIVE);
				}
			}).click(function (event) {
				$(target(event)).addClass(CLASSES.ACTIVE);
				select();
				if (options.inputFocus)
					input.focus();
				else
					input.blur();
				return false;
			}).mousedown(function (event) {
				config.mouseDownOnSelect = true;
				if (options.mouseDown)
					options.mouseDown($(target(event)));
			}).mouseup(function (event) {
				config.mouseDownOnSelect = false;
				if (options.mouseUp)
					options.mouseUp($(target(event)));
			}).mouseout(function(event) {
				if (options.mouseOut)
					options.mouseOut($(target(event)), config.mouseDownOnSelect);
			}).mouseover(function(event) {
				if (options.mouseOver)
					options.mouseOver($(target(event)), config.mouseDownOnSelect);
			});

			if (options.deselectOnMouseOut)
				element.mouseleave(function () {
					list.find("li").removeClass(CLASSES.ACTIVE);
				});

			if (options.width > 0)
				element.css("width", options.width);

			if (options.noResults) {
				$noResults = $('<div class="ac_noresults" />');
				$noResults.append(options.noResults);
				$noResults.hide();
				element.append($noResults);
			}

			needsInit = false;
		}

		function target(event) {
			var element = event.target;
			while (element && element.tagName != "LI")
				element = element.parentNode;
			// more fun with IE, sometimes event.target is empty, just ignore it then
			if (!element)
				return [];
			return element;
		}

		function moveSelect(step) {
			listItems.slice(active, active + 1).removeClass(CLASSES.ACTIVE);
			movePosition(step);
			var activeItem = listItems.slice(active, active + 1).addClass(CLASSES.ACTIVE);
			if (options.scroll) {
				var offset = 0;
				listItems.slice(0, active).each(function () {
					offset += this.offsetHeight;
				});
				if ((offset + activeItem[0].offsetHeight - list.scrollTop()) > list[0].clientHeight) {
					list.scrollTop(offset + activeItem[0].offsetHeight - list.innerHeight());
				} else if (offset < list.scrollTop()) {
					list.scrollTop(offset);
				}
			}
		};

		function movePosition(step) {
			if (options.scrollJumpPosition || (!options.scrollJumpPosition && !((step < 0 && active == 0) || (step > 0 && active == listItems.size() - 1)))) {
				active += step;
				if (active < 0) {
					active = listItems.size() - 1;
				} else if (active >= listItems.size()) {
					active = 0;
				}
			}
		}


		function limitNumberOfItems(available, t) {
			// only cap if less than 4 chars
			if (t && t.length > 3)
				return available;
			
			return options.max && options.max < available
				? options.max
				: available;
		}

		function fillList() {
			list.empty();
			var max = limitNumberOfItems(data.length, term);
			for (var i = 0; i < max; i++) {
				if (!data[i])
					continue;
				var formatted = options.formatItem(data[i].data, i + 1, max, data[i].value, term);
				if (formatted === false)
					continue;
				var $li = $("<li/>").html(options.highlight(formatted, term)).addClass(i % 2 == 0 ? "ac_even" : "ac_odd").appendTo(list);
				var li = $li[0];
				$.data(li, "ac_data", data[i]);
				
				if (options.processItem)
					options.processItem($li, data[i], i);
			}
			listItems = list.find("li");
			if (options.selectFirst || listItems.length == 1) {
				listItems.slice(0, 1).addClass(CLASSES.ACTIVE);
				active = 0;
			}
			// apply bgiframe if available
			if ($.fn.bgiframe)
				list.bgiframe();
		}

		function setLocation() {
			var $input = $(input);
			var offset = $input.offset();
			var css = {
				width: typeof options.width == "string" || options.width > 0 ? options.width : ($input.outerWidth() - 2),
				left: options.left ? options.left($input, offset) : offset.left
			}
			if (options.top != 'auto') 
				css.top = options.top ? options.top($input, offset) : (offset.top + $input.outerHeight());
			element.css(css);
		}

		return {
			display: function (d, q) {
				init();
				if ($noResults)
					$noResults.hide();
				data = d;
				term = q;
				fillList();
			},
			next: function () {
				moveSelect(1);
			},
			prev: function () {
				moveSelect(-1);
			},
			pageUp: function () {
				if (active != 0 && active - 8 < 0) {
					moveSelect(-active);
				} else {
					moveSelect(-8);
				}
			},
			pageDown: function () {
				if (active != listItems.size() - 1 && active + 8 > listItems.size()) {
					moveSelect(listItems.size() - 1 - active);
				} else {
					moveSelect(8);
				}
			},
			itemCount: function () {
				if (!data)
					return 0;
				return data.length;
			},
			hide: function () {
				if (options.preventHide && options.preventHide())
					return;

				if ($(input).is(":focus"))
					return;

				element && element.hide();
				$(input).removeClass('ac_open');
				listItems && listItems.removeClass(CLASSES.ACTIVE);
				active = -1;

				if(options.clearOnHide)
					$(input).val("");

				if (options.hide)
					options.hide();
			},
			visible: function () {
				return element && element.is(":visible");
			},
			current: function () {
				return this.visible() && (listItems.filter("." + CLASSES.ACTIVE)[0] || options.selectFirst && listItems[0]);
			},
			currentPos: function () {
				return listItems.index(listItems.filter("." + CLASSES.ACTIVE)[0]);
			},
			show: function () {
				setLocation();
				element.show();
				$(input).addClass('ac_open');
				if (options.scroll) {
					list.scrollTop(0);
					element.css({
						"max-height": options.scrollHeight,
						"overflow-x": "hidden",
						"overflow-y": 'auto'
					});
				}
			},
			tryShowNoResults: function () {
				if ($noResults) {
					this.show();
					$noResults.show();
				} else
					this.hide();
			},
			selected: function () {
				var selected = listItems && listItems.filter("." + CLASSES.ACTIVE).removeClass(CLASSES.ACTIVE);
				return selected && selected.length && $.data(selected[0], "ac_data");
			},
			emptyList: function () {
				list && list.empty();
			},
			unbind: function () {
				element && element.remove();
			}
		};
	};

	$.fn.selection = function (start, end) {
		if (start !== undefined) {
			return this.each(function () {
				if (this.createTextRange) {
					var selRange = this.createTextRange();
					if (end === undefined || start == end) {
						selRange.move("character", start);
						selRange.select();
					} else {
						selRange.collapse(true);
						selRange.moveStart("character", start);
						selRange.moveEnd("character", end);
						selRange.select();
					}
				} else if (this.setSelectionRange) {
					this.setSelectionRange(start, end);
				} else if (this.selectionStart) {
					this.selectionStart = start;
					this.selectionEnd = end;
				}
			});
		}
		var field = this[0];
		if (field.createTextRange) {
			var range = document.selection.createRange(),
				orig = field.value,
				teststring = "<->",
				textLength = range.text.length;
			range.text = teststring;
			var caretAt = field.value.indexOf(teststring);
			field.value = orig;
			this.selection(caretAt, caretAt + textLength);
			return {
				start: caretAt,
				end: caretAt + textLength
			};
		} else if (field.selectionStart !== undefined) {
			return {
				start: field.selectionStart,
				end: field.selectionEnd
			};
		}
	};

})(jQuery);