const Book = require('../models/Book');
const fs = require('fs');

exports.createBook = (req, res, next) => {
    const bookObject = JSON.parse(req.body.book);
    delete bookObject._id;
    delete bookObject.userId;
    console.log(bookObject.ratings[0]._id);
    const book = new Book({
        ...bookObject,
        userId: req.auth.userId,
        imageUrl: `${req.protocol}://${req.get('host')}/images/${req.file.filename}`
    });
    book.save()
        .then(() => res.status(201).json({ message: 'Livre enregistré' }))
        .catch(error => res.status(400).json({ error }));
};

exports.modifyBook = (req, res, next) => {
    const bookObject = req.file ? {
        ...JSON.parse(req.body.book),
        imageUrl: `${req.protocol}://${req.get('host')}/images/${req.file.filename}`
    } : { ...req.body }

    delete bookObject.userId;
    Book.findOne({ _id: req.params.id })
        .then((book) => {
            if (book.userId != req.auth.userId) {
                res.status(401).json({ message: 'Non autorisé' });
            }
            else {
                Book.updateOne({ _id: req.params.id }, { ...bookObject, _id: req.params.id })
                    .then(() => res.status(200).json({ message: 'Livre modifié' }))
                    .catch(error => res.status(401).json({ error }));
            }
        })
        .catch(error => res.status(400).json({ error }));
};

exports.deleteBook = (req, res, next) => {
    Book.findOne({ _id: req.params.id })
        .then(book => {
            if (book.userId != req.auth.userId) {
                res.status(401).json({ message: 'Non autorisé' });
            }
            else {
                const filename = book.imageUrl.split('/images/')[1];
                fs.unlink(`images/${filename}`, () => {
                    Book.deleteOne({ _id: req.params.id })
                        .then(() => res.status(200).json({ message: 'Livre supprimé' }))
                        .catch(error => res.status(401).json({ error }));
                });
            }
        })
        .catch(error => res.status(500).json({ error }));
};

exports.getOneBook = (req, res, next) => {
    Book.findOne({ _id: req.params.id })
        .then(book => res.status(200).json(book))
        .catch(error => res.status(404).json({ error }));
};

exports.getAllBooks = (req, res, next) => {
    Book.find()
        .then(books => res.status(200).json(books))
        .catch(error => res.status(400).json({ error }));
    
};

exports.getBestRating = (req, res, next) => {
    Book.find()
        .then(books => {
            books.sort((a, b) => b.averageRating - a.averageRating).splice(3);
            res.status(200).json( books)})
        .catch(error => res.status(400).json({ error }));
};

exports.addRating = (req, res, next) => {
    const addRate = {
        userId: req.body.userId,
        grade: req.body.rating
    };
    Book.findOne({ _id: req.params.id })
        .then(book => {
            book.ratings.push(addRate);
            const sumArray = [];
            book.ratings.map((rate) => sumArray.push(rate.grade));
            const sum = sumArray.reduce((accumulator, currentValue) => {
                return accumulator + currentValue;
            }, 0);
            const sumAverage = sum / sumArray.length;
            book.averageRating = sumAverage;
            book.save()
                .then(() => res.status(201).json(book))
                .catch(error => res.status(400).json({ error }));
        })
        .catch(error => res.status(401).json({ error }));
};