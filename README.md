# Worker JavaScript

## Description
To monitor Tab count in the browser and AJAX a server only form one of all opened tabs of one html app

## Features
- counts Tab of current html app
- ping a server with ajax and sends curren client's datetime and tabs opened
- "main" tab handles received data and post them to other tabs via BroadcastChannel https://developer.mozilla.org/en-US/docs/Web/API/Broadcast_Channel_API
- uses localStorage to monitor opened tabs and assigns a "main" tab

## Installation
```<script type="text/javascript" src="evkworker.js"></script>
....
<script type="text/javascript">
document.addEventListener('DOMContentLoaded', () => {
   // monitor tab and AJAX every 10 sec with prefix '_my' for BroadcastChannel and localStorage vars
		 const monitor = new EVKworker('YorAPIEntryPoint', '_my', 10000);
	});
</script>
