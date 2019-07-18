const express = require('express');
const helmet = require('helmet');
const morgan = require('morgan');
const userDb = require('../data/helpers/userDb.js');
const postDb = require('../data/helpers/postDb.js');

const server = express();

//Custom Middlewhere
function capitalize(req, res, next) {
	const {name} = req.body;
	if (name) {
		req.body.name = name
			.split(' ')
			.map(i =>
				i
					.split('')
					.map((e, i) => {
						if (i === 0) {
							return e.toUpperCase();
						}
						return e;
					})
					.join('')
			)
			.join(' ');
		next();
	} else {
		res.status(500).json('The name needs to be capitalized');
	}
}

//configure middleware
server.use(express.json());
server.use(helmet());
server.use(morgan('short'));

//sanity check
server.get('/', (req, res) => {
	res.send(`sanity check success`);
});

//get all users
server.get('/api/users', (req, res) => {
	userDb
		.get()
		.then(users => {
			res.status(200).json(users);
		})
		.catch(err => {
			res.json(err);
		});
});

//get all posts
server.get('/api/posts', (req, res) => {
	postDb
		.get()
		.then(posts => {
			res.status(200).json(posts);
		})
		.catch(err => {
			res.json(err);
		});
});

//get specific user
server.get('/api/users/:userid', (req, res) => {
	const id = req.params.userid;

	userDb
		.get(id)
		.then(user => {
			if (user) {
				res.status(200).json(user);
			} else {
				res.status(404).json({
					message: 'User not found, enter a valid ID'
				});
			}
		})
		.catch(err => res.status(500).json(err));
});

//get specific post
server.get('/api/posts/:postid', (req, res) => {
	const id = req.params.postid;
	postDb
		.get(id)
		.then(post => {
			console.log(post);
			if (post) {
				res.status(200).json(post);
			} else {
				res.status(500).json({
					message: 'Post not found, enter a valid ID'
				});
			}
		})
		.catch(err =>
			res.status(404).json({
				message: 'Post not found, enter a valid ID'
			})
		);
});

//create a new user
server.post('/api/users', capitalize, (req, res) => {
	const userInfo = req.body;

	//check to see if the object has a name
	if (!userInfo.name || userInfo.name.length > 128) {
		res.status(400).json({
			errorMessage:
				'Please provide a valid name for the user (<128 chars).'
		});
	}

	//check to see that the rest of the object is formatted correctly
	else if (Object.keys(userInfo).length != 1) {
		res.status(400).json({
			errorMessage:
				"Please provide a valid object for the user: { name : 'Bob Dole' }"
		});
	} else {
		//check to see if that name is taken already
		userDb
			.get()
			.then(users =>
				users.forEach(user => {
					if (user.name === userInfo.name) {
						res.status(400).json({
							errorMessage:
								'Please provide a unique name for the user.'
						});
					} else {
						//actually add the new user
						userDb
							.insert(userInfo)
							.then(result => {
								res.status(201).json(result);
							})
							.catch(err =>
								res.status(500).json({
									message: 'Adding the user failed'
								})
							);
					}
				})
			)
			.catch(err => res.status(500).json(err));
	}
});

//create a new post
server.post('/api/posts', (req, res) => {
	const postInfo = req.body;
	const userId = postInfo.userId;

	//check to see if the object has a text
	if (!postInfo.text) {
		res.status(400).json({
			errorMessage: 'Please provide a valid text key for the post.'
		});
	}

	//check to see if the object has a userId
	else if (!userId) {
		res.status(400).json({
			errorMessage: 'Please provide a valid userId key for the post.'
		});
	}

	//check to see that the rest of the object is formatted correctly
	else if (Object.keys(postInfo).length != 2) {
		res.status(400).json({
			errorMessage:
				"Please provide a valid object for the user: { text : 'Hello', userId : 12 }"
		});
	} else {
		//check to see if the userId is valid
		userDb
			.get()
			.then(users => {
				if (!users.map(item => item.id).includes(userId)) {
					invalidBool = true;
					res.status(400).json({
						errorMessage:
							'Please provide an id for a user who exists'
					});
				} else {
					//actually add the new post
					postDb
						.insert(postInfo)
						.then(result => {
							postDb
								.get(result.id)
								.then(post => {
									res.status(201).json(post);
								})
								.catch(err =>
									res.status(500).json({
										message:
											'Finding the added post failed',
										error: err
									})
								);
						})
						.catch(err =>
							res.status(500).json({
								message: 'Adding the post failed',
								error: err
							})
						);
				}
			})
			.catch(err => res.status(500).json(err));
	}
});

//delete a user by ID
server.delete('/api/users/:id', (req, res) => {
	const {id} = req.params;
	userDb
		.get(id)
		.then(user => {
			if (user) {
				userDb.remove(id).then(count => {
					res.status(200).json(user);
				});
			} else {
				res.status(404).json({
					message: 'The user with the specified ID does not exist'
				});
			}
		})
		.catch(err => res.status(500).json(err));
});

//delete a post by ID
server.delete('/api/posts/:id', (req, res) => {
	const {id} = req.params;
	console.log(id);
	postDb
		.get(id)
		.then(post => {
			if (post) {
				postDb.remove(id).then(count => {
					res.status(200).json(post);
				});
			} else {
				res.status(404).json({
					message: 'The post with the specified ID does not exist'
				});
			}
		})
		.catch(err =>
			res.status(404).json({
				message: 'The post with the specified ID does not exist today'
			})
		);
});

//Update a user
server.put('/api/users/:id', capitalize, (req, res) => {
	const id = req.params.id;
	const changes = req.body;

	//check to see if the object has a name
	if (!changes.name || changes.name.length > 128) {
		res.status(400).json({
			errorMessage: 'Please provide a name for the user.'
		});
	}

	//check to see that the rest of the object is formatted correctly
	else if (Object.keys(changes).length != 1) {
		res.status(400).json({
			errorMessage:
				"Please provide a valid object for the post: { name : 'Bob Dole' }"
		});
	} else {
		//update user
		userDb
			.get(id)
			.then(user => {
				if (user) {
					userDb
						.update(id, changes)
						.then(count => {
							res.status(200).json(count);
						})
						.catch(err => res.status(500).json(err));
				} else {
					res.status(404).json({
						message: 'The user with the specific ID does not exist'
					});
				}
			})
			.catch(err => res.status(500).json(err));
	}
});

//Update a post
server.put('/api/posts/:id', (req, res) => {
	const id = req.params.id;
	const changes = req.body;

	//check to see if the object has a text
	if (!changes.text) {
		res.status(400).json({
			errorMessage: 'Please provide a valid text for the post.'
		});
	}

	//check to see if the object has a userId
	else if (changes.id != id) {
		res.status(400).json({
			errorMessage:
				'Please provide a valid and matching id for the post and the route.'
		});
	}

	//check to see that the rest of the object is formatted correctly
	else if (Object.keys(changes).length != 2) {
		res.status(400).json({
			errorMessage:
				"Please provide a valid object for the post: { text : 'Hello', userId : 12 }"
		});
	} else {
		//update post
		postDb
			.get(id)
			.then(post => {
				postDb
					.update(id, changes)
					.then(count => {
						res.status(200).json(count);
					})
					.catch(err => res.status(500).json(err));
			})
			.catch(err =>
				res.status(404).json({
					message: 'The post with the specific ID does not exist'
				})
			);
	}
});

module.exports = server;
