const express = require('express');
const helmet = require('helmet');
const morgan = require('morgan');
const userDb = require('../data/helpers/userDb.js');

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

//create a new user
server.post('/api/users', capitalize, (req, res) => {
	const userInfo = req.body;

	//check to see if the object has a name
	if (!userInfo.name) {
		res.status(400).json({
			errorMessage: 'Please provide a name for the user.'
		});
	}

	//check to see that the rest of the object is formatted correctly
	if (Object.keys(userInfo).length != 1) {
		res.status(400).json({
			errorMessage:
				"Please provide a valid object for the user: { name : 'Bob Dole' }"
		});
	}

	//check to see if that name is taken already
	userDb
		.get()
		.then(users =>
			users.forEach(item => {
				if (item.name === userInfo.name) {
					res.status(400).json({
						errorMessage:
							'Please provide a unique name for the user.'
					});
				}
			})
		)
		.catch(err => res.status(500).json(err));

	//actually add the new user
	userDb
		.insert(userInfo)
		.then(result => {
			userDb
				.get(result.id)
				.then(user => {
					res.status(201).json(user);
				})
				.catch(err =>
					res
						.status(500)
						.json({message: 'Finding the added user failed', error: err})
				);
		})
		.catch(err =>
			res.status(500).json({message: 'Adding the user failed', error: err})
		);
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

//Update a user
server.put('/api/users/:id', capitalize, (req, res) => {
	const id = req.params.id;
	const changes = req.body;

	//check to see if the object has a name
	if (!changes.name) {
		res.status(400).json({
			errorMessage: 'Please provide a name for the user.'
		});
	}

	//check to see that the rest of the object is formatted correctly
	if (Object.keys(changes).length != 1) {
		res.status(400).json({
			errorMessage:
				"Please provide a valid object for the user: { name : 'Bob Dole' }"
		});
	}

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
});

module.exports = server;
