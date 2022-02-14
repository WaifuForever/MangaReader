import Manga from '../models/manga.model.js';
import Review from '../models/review.model.js';
import User from '../models/user.model.js';

import { decrypt } from '../utils/password.util.js';
import { getMessage } from '../utils/message.util.js';

async function store(req, res) {
    const { manga_id, text, rating } = req.body;
    const new_token = req.new_token ? req.new_token : null;
    req.new_token = null;

    const current_user = decrypt(req.auth);
    req.auth = null;

    const user = await User.findById(current_user);

    const manga = await Manga.findById(manga_id);

    if (!manga && process.env.NODE_ENV !== 'test')
        return res.jsonBadRequest(null, getMessage('review.error.manga'), null);

    const doesReviewExist = await Review.exists({
        user_id: current_user,
        manga_id: manga_id,
    });

    if (doesReviewExist) {
        return res.jsonNotFound(
            null,
            getMessage('review.error.duplicate'),
            new_token,
        );
    }

    const review = new Review({
        text: text,
        rating: rating,
        user_id: current_user,
        manga_id: manga_id,
    });

    if (process.env.NODE_ENV !== 'test') {
        manga.reviews.push(review._id);
        user.reviews.push(review._id);
        manga.rating += rating;

        manga.updatedAt = Date.now();
        user.updatedAt = Date.now();

        manga
            .save()
            .then(() => {
                user.save()
                    .then(() => {
                        review
                            .save()
                            .then(result => {
                                return res.jsonOK(
                                    result,
                                    getMessage('review.save.success'),
                                    new_token,
                                );
                            })
                            .catch(err => {
                                console.log(err);
                                return res.jsonServerError(
                                    null,
                                    null,
                                    err.toString(),
                                );
                            });
                    })
                    .catch(err => {
                        console.log(err);
                        return res.jsonServerError(null, null, err.toString());
                    });
            })
            .catch(err => {
                console.log(err);
                return res.jsonServerError(null, null, err.toString());
            });
    } else {
        review
            .save()
            .then(result => {
                return res.jsonOK(
                    result,
                    getMessage('review.save.success'),
                    new_token,
                );
            })
            .catch(err => {
                console.log(err);
                return res.jsonServerError(null, null, err.toString());
            });
    }
}

async function findOne(req, res) {
    const { _id } = req.query;
    const new_token = req.new_token ? req.new_token : null;
    req.new_token = null;

    Review.findById(_id)
        .then(review => {
            if (review)
                return res.jsonOK(
                    review,
                    getMessage('review.findone.success'),
                    new_token,
                );
            return res.jsonNotFound(
                null,
                getMessage('review.notfound'),
                new_token,
            );
        })
        .catch(err => {
            return res.jsonServerError(null, null, new_token);
        });
}

async function list(req, res) {
    const { user_id, manga_id } = req.query;
    const new_token = req.new_token ? req.new_token : null;
    req.new_token = null;

    if (user_id) {
        Review.find({ user_id: user_id })
            .then(docs => {
                return res.jsonOK(
                    docs,
                    getMessage('review.list.success'),
                    new_token,
                );
            })
            .catch(err => {
                return res.jsonNotFound(
                    null,
                    getMessage('review.notfound'),
                    new_token,
                );
            });
    } else {
        Review.find({ manga_id: manga_id })
            .then(docs => {
                return res.jsonOK(
                    docs,
                    getMessage('review.list.success'),
                    new_token,
                );
            })
            .catch(err => {
                return res.jsonNotFound(
                    null,
                    getMessage('review.notfound'),
                    new_token,
                );
            });
    }
}

async function update(req, res) {
    const { _id, text, rating } = req.body;
    const new_token = req.new_token ? req.new_token : null;
    req.new_token = null;

    let user_id = decrypt(req.auth);
    req.auth = null;

    Review.findById({ _id: _id })
        .then(review => {
            if (review.user_id.toString() !== user_id.toString())
                return res.jsonUnauthorized(null, null, null);

            let temp = -review.rating + rating;
            review.rating = rating;
            review.text = text;
            if (!process.env.NODE_ENV === 'test') {
                Manga.findById({ _id: review.manga_id })
                    .then(manga => {
                        manga.rating += temp;
                        manga
                            .save()
                            .then(() => {
                                review
                                    .save()
                                    .then(() => {
                                        return res.jsonOK(
                                            null,
                                            getMessage('review.update.success'),
                                            new_token,
                                        );
                                    })
                                    .catch(err => {
                                        return res.jsonServerError(
                                            null,
                                            null,
                                            err,
                                        );
                                    });
                            })
                            .catch(err => {
                                return res.jsonServerError(null, null, err);
                            });
                    })
                    .catch(err => {
                        return res.jsonServerError(null, null, err);
                    });
            } else {
                review
                    .save()
                    .then(() => {
                        return res.jsonOK(
                            null,
                            getMessage('review.update.success'),
                            new_token,
                        );
                    })
                    .catch(err => {
                        return res.jsonServerError(null, null, err);
                    });
            }
        })
        .catch(err => {
            console.log(err);
            return res.jsonNotFound(
                err,
                getMessage('review.notfound'),
                new_token,
            );
        });
}

async function remove(req, res) {
    const { _id } = req.query;
    const review = await Review.findById(_id);

    const new_token = req.new_token ? req.new_token : null;
    req.new_token = null;

    const user_id = decrypt(req.auth);
    req.auth = null;

    if (review) {
        if (review.user_id.toString() === user_id) {
            const response = await Review.deleteOne({ _id: _id });

            // `1` if MongoDB deleted a doc, `0` if no docs matched the filter `{ name: ... }`
            if (response.n === 0)
                return res.jsonNotFound(
                    response,
                    getMessage('review.notfound'),
                    new_token,
                );

            const user = await User.findById(user_id);

            user.reviews = user.reviews.filter(function (_id) {
                return _id.toString() !== _id.toString();
            });

            const manga = await Manga.findById(review.manga_id);
            manga.rating -= review.rating;
            manga.reviews = manga.reviews.filter(function (_id) {
                return _id.toString() !== _id.toString();
            });

            user.save(function (err) {
                // yet another err object to deal with
                if (err) {
                    return res.jsonServerError(null, null, err);
                }
            });

            manga.save(function (err) {
                // yet another err object to deal with
                if (err) {
                    return res.jsonServerError(null, null, err);
                }
            });

            return res.jsonOK(null, getMessage('review.deleted'), new_token);
        } else return res.jsonUnauthorized(null, null, null);
    } else
        return res.jsonNotFound(null, getMessage('review.notfound'), new_token);
}

export default { store, findOne, list, update, remove };
