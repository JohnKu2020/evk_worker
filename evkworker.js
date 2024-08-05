/**
 * @fileOverview	This file contains utility functions to communicate with server's API only from one Tab 
 *					if there are more then one tab opened
 * @file 			evkworker.js
 * @description		A set of utility functions to perform AJAX request to a server to monitor the count of active Tab opened and centrlized *					messaging between Tabs
 * @version 1.0.0
 * @date 2024-08-04
 * @author Yevhen K 
 * @dependencies None
 * @license MIT
 */

class EVKworker {
  constructor(apiEndpoint, preName, fetchInterval = 5000) {
    this.fetchInterval = fetchInterval;
    this.apiEndpoint = apiEndpoint;
	this.preName = preName;
	this.inWork = this.preName + 'in_work';
    this.isFetching = false;
    this.intervalId = null;
	this.debug = true;
	this.tabs = 0;
	this.el_online = null;
	this.lastPollTick = 0;
	this.PollTickLimit = this.fetchInterval - 500;

	// Create a BroadcastChannel for inter-tab communication
	this.channel = new BroadcastChannel(this.preName + 'evk_channel');

	// Listen for messages from other tabs
	this.channel.onmessage = (event) => {
		if (event.data.type === 'newData') {
			if (this.debug) console.log('[mon]: data from tab:', event.data.data);
			this.handleNewData(event.data.data);
		} else if (event.data.type === 'countTabs') {
			if (this.debug) console.log('[mon]: countTabs');
			this.updateTabCount(1);
		}
	};

	// Listen for storage changes to coordinate between tabs
	window.addEventListener('storage', (event) => {
		if (event.key === this.inWork) {
			this.checkAndStartFetching();
		} if (event.key === this.preName + '_Tabs' && event.newValue === null ) {
			if (this.debug) console.log('[mon]: Tab recalc');
			setTimeout(() => { this.updateTabCount(1) }, 50 + Math.random() * 1000);
		}
	});

	// Handle the tab closing event
	window.addEventListener('beforeunload', () => {
		localStorage.removeItem(this.preName + '_Tabs');
		if (this.isFetching) {
			localStorage.setItem(this.inWork, 'false');
		}
	});

	// Increase Tab count 
	this.updateTabCount(1);

	// Initialize fetching status
	this.initializeFetchingStatus();
  }


	initializeFetchingStatus() {
		if (this.debug) console.log('[mon]:init');
		if (localStorage.getItem(this.inWork) !== 'true') {
			this.startFetching();
		} else {
			this.checkAndStartFetching();
		}
	}

	checkAndStartFetching() {
		setTimeout(() => {
			if (localStorage.getItem(this.inWork) !== 'true' && !this.isFetching) {
				this.startFetching();
			} else {
				this.stopFetching();
			}
		}, 500 + Math.random() * 2000); // Add a small random delay to prevent race conditions
	}

	startFetching() {
		if (!this.isFetching) {
			if (this.debug) console.log('[mon]:start->master');
			this.isFetching = true;
			this.el_online = $('#useronlinestate');
			this.hightlightActiveTab();
			localStorage.setItem(this.inWork, 'true');
			this.fetchEvents();
		}
	}

	stopFetching() {
		if (this.isFetching) {
			if (this.debug) console.log('[mon]:stop');
			this.isFetching = false;
			localStorage.setItem(this.inWork, 'false');
			this.hightlightActiveTab()
			if (this.intervalId) {
				clearTimeout(this.intervalId);
				this.intervalId = null;
			}
		}
	}

	fetchEvents() {
		if (!this.isFetching || localStorage.getItem(this.inWork) !== 'true') {
			this.isFetching = false;
			return;
		}

		//To control the rate of ajax requests to the server
		var n = Date.now();
		if (this.lastPollTick >0) {
			var treshold = (n - this.lastPollTick);
			if (treshold<this.PollTickLimit) {
				if (this.debug) console.log('[mon]: threshold ['+this.PollTickLimit+'] ->' + treshold);
				this.lastPollTick = 0;
				setTimeout(() => { this.stopFetching() }, 500 + Math.random() * 2000);
				return;
			}
		}

		if (this.debug) console.log('[mon]['+this.updateTabCount(0)+']:ping...');
		// Check global var if we're online
		if((jsopts['_Network_state'] !== undefined && jsopts['_Network_state'] !== null) && !jsopts['_Network_state']) return false;
		$.ajax({url: this.apiEndpoint, method: 'POST', dataType: 'json', cache: false, 
			data: {
				'act':'ping',
				'data': {
					'tabs': this.updateTabCount(0),
					'time': GetCurrentDateTime()
				}
			},
			success: (data) => {
				if (this.debug) console.log('[mon]:data :', data);
				this.channel.postMessage({ type: 'newData', data: data });
				this.intervalId = setTimeout(() => this.fetchEvents(), this.fetchInterval);
			},
			complete: (xhr,status) => {
				// Just to debug poll time
				var now = Date.now(), elapsed = 0;
				if (this.lastPollTick >0) {
					elapsed = now - this.lastPollTick;
					if (this.debug) console.log("[mon]: elapsed: " + elapsed);
				}
				this.lastPollTick = now;
			},		  
			error: (error) => {
				console.error('Error ajax:', error);
				this.intervalId = setTimeout(() => this.fetchEvents(), this.fetchInterval);
			}
		});
	}

	handleNewData(qdata) {
		// Treat data received
	}
	// ================================ Utility Functions ==========================================
	
	hightlightActiveTab(){
		// To highlight a control to indicate the "main" Tab
		// <p class="navbar-text"><span id="useronlinestate" class="label bg-success">inWork</span></p>
		if (this.isFetching) {
			if (this.el_online) this.el_online.addClass('active-tab');
		} else {
			if (this.el_online) this.el_online.removeClass('active-tab');
		}
	}	
	
	updateTabCount(change) {
		// Gets saved Tab count, adds change and returns a total count
		this.tabs = parseInt(localStorage.getItem(this.preName + '_Tabs')) || 0;
		if ((change <0 && this.tabs > 0) || change >=0) {
			this.tabs += change;
			localStorage.setItem(this.preName + '_Tabs', this.tabs);
		}
		return this.tabs;
	}  
}