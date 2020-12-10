// Search Param reference
const url = new URL(window.location.href);
// ID
var userid = localStorage.getItem("_id");
var username = localStorage.getItem("username");
var token = localStorage.getItem("token");
var touserid;
var chatList;
document.querySelector("#sidebar h1").innerHTML += `<br>(user:${username})`;

friendList();

function initChat() {
	document.querySelector("#messages").innerHTML = "";
	fetch(`/message/@${touserid}`, {
		headers: {
			Authorization: "Bearer " + token,
		},
	})
		.then((res) => res.json())
		.then((res) => {
			console.log(res);
			res.data.forEach((message) => {
				let attachements = [];
				if (message.attachments.length > 0) {
					message.attachments.forEach((a) => {
						var path = a.path.split("\\");
						path.splice("0", 1);
						attachements.push(
							a.type === "video/mp4"
								? `<video width="300px" controls="" name="media"><source src="${path.join(
										"/"
								  )}" type="video/mp4"></video><br>`
								: `<img style="-webkit-user-select: none;margin: zoom-in;" src="${path.join(
										"/"
								  )}" width="150"><br>`
						);
					});
				}

				const messageElement = `<div>${
					message.attachments.length > 0
						? (userid === message.userid._id
								? "You : "
								: message.userid.username + " : ") + attachements
						: (userid === message.userid._id
								? "You : "
								: message.userid.username + " : ") + message.message
				}</div>`;

				document.querySelector("#messages").innerHTML += messageElement;
			});
		});
}

// Search Users
document.getElementById("info-search").addEventListener("input", (e) => {
	document.querySelector(".toUserList").innerHTML = "";
	if (e.target.value === "") return friendList();
	fetch(`/user?search=${e.target.value}`, {
		headers: {
			Authorization: "Bearer " + token,
		},
	})
		.then((res) => res.json())
		.then((res) => {
			console.log(res);
			if (res.length === 0)
				return (document.querySelector(".info-userlist").innerHTML =
					"<h4>No user's found :(</h4>");
			res.forEach((user) => {
				document.querySelector(
					".toUserList"
				).innerHTML += `<p class="touserid ${user._id}">${user.username}</p>`;
			});
			// Change touserid when clicked
			addListener(document.getElementsByClassName("touserid"));
		});
});

// Friend List
function friendList() {
	document.querySelector(".toUserList").innerHTML = "";
	fetch(`/message/chat`, {
		headers: {
			Authorization: "Bearer " + token,
		},
	})
		.then((res) => res.json())
		.then((res) => {
			console.log(res);
			chatList = res.channels.map((c) => c.channel._id);
			res.channels.forEach((channel) => {
				const user = channel.channel;
				document.querySelector(
					".toUserList"
				).innerHTML += `<p class="touserid ${user._id}">${user.username}</p>`;
			});
			// Change touserid when clicked
			addListener(document.getElementsByClassName("touserid"));
		});
}

// Adding Listener to touserid list
function addListener(elementsArray) {
	// Chat
	Array.from(elementsArray).forEach((element) => {
		element.addEventListener("click", (e) => {
			// Disable send after selecting chat
			document.querySelector("#send").disabled = false;

			// Change background color if its blue(when new message recieved)
			element.style.backgroundColor = "rgb(170, 170, 170)";

			touserid = e.target.getAttribute("class").split(" ")[1];
			document.querySelector(".title-chat").innerHTML =
				"Chat with user " + e.target.innerHTML;
			initChat();
		});
	});
}

const ws = new WebSocket(location.origin.replace(/^http/, "ws") + "/" + token);

ws.onopen = function () {
	console.log("connected");
	document.querySelector("#send").addEventListener("click", function () {
        const files=document.querySelector('input[type=file]').files
        if(files.length>0){
            sendFile(files);
            return document.querySelector('input[type=file]').value="";
        }
		ws.send(
			JSON.stringify({
				touserid: touserid,
				message: document.querySelector("#message").value,
			})
		);
		document.getElementById("message").value = "";
	});
};

ws.onerror = function (error) {
	console.log(error);
};

ws.onmessage = function (msg) {
	const formattedResponse = JSON.parse(msg.data);
	console.log(formattedResponse);
	// Checking if its from new person
	if (
		!(
			chatList.includes(formattedResponse.userid._id) ||
			chatList.includes(formattedResponse.touserid._id)
		)
	) {
		friendList();
	}

	// Highlight message when not in focus or add to chat list
	// (touserid === formattedResponse.touserid && touserid !== userid)
	if (
		touserid === formattedResponse.userid._id ||
		formattedResponse.userid._id === userid
	) {
		let attachements = [];
        if (formattedResponse.attachments.length > 0) {
            formattedResponse.attachments.forEach((a) => {
                var path = a.path.split("\\");
                path.splice("0", 1);
                attachements.push(
                    a.type === "video/mp4"
                        ? `<video width="300px" controls="" name="media"><source src="${path.join(
                                "/"
                            )}" type="video/mp4"></video><br>`
                        : `<img style="-webkit-user-select: none;margin: zoom-in;" src="${path.join(
                                "/"
                            )}" width="150"><br>`
                );
            });
        }

        const messageElement = `<div>${
            formattedResponse.attachments.length > 0
                ? (userid === formattedResponse.userid._id
                        ? "You : "
                        : formattedResponse.userid.username + " : ") + attachements
                : (userid === formattedResponse.userid._id
                        ? "You : "
                        : formattedResponse.userid.username + " : ") + formattedResponse.message
        }</div>`;

        document.querySelector("#messages").innerHTML += messageElement;
	} else {
		Array.from(document.getElementsByClassName("touserid")).forEach(
			(element) => {
				if (element.innerHTML === formattedResponse.userid._id) {
					element.style.backgroundColor = "lightblue";
				}
			}
		);
	}
};

// Send File
async function sendFile(files) {
	let fd = new FormData();
	for (const file of files) {
		fd.append("media", file);
	}
	fd.append("touserid", touserid);

	fetch("/message", {
		method: "post",
		headers: {
			Authorization: "Bearer " + token,
		},
		body: fd,
	})
		.then((res) => res.json())
		.then((res) => {
			ws.send(
				JSON.stringify({
					touserid: touserid,
					message: "",
					attachments: res,
				})
			);
		});
}
