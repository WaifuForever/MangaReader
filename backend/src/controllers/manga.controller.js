import fs from 'fs';

import Author from '../models/author.model.js';
import Chapter from '../models/chapter.model.js';
import Manga from '../models/manga.model.js';
import User from '../models/user.model.js';

import { decrypt } from '../utils/password.util.js';
import { getMessage } from '../utils/message.util.js';

import { folderName } from '../config/multer.config.js';
const list_projection = {
    0: {
        title: 1,
        genre: 1,
        synopsis: 1,
        n_chapters: 1,
        status: 1,
        nsfw: 1,
        rating: 1,
        imgCollection: 1,
        type: 1,
        likes: 1,
        themes: 1,
        genres: 1,
        languages: 1,
        writer_id: 1,
        artist_id: 1,
        _id: 0,
    },
    1: {
        updatedAt: 1,
        createdAt: 1,
        title: 1,
        genre: 1,

        type: 1,
        synopsis: 1,
        n_chapters: 1,

        languages: 1,
        nsfw: 1,
        status: 1,
        writer_id: 1,
        artist_id: 1,
        scan_id: 1,
        rating: 1,
        themes: 1,
        genres: 1,
        likes: 1,
        __v: 1,
        imgCollection: 1,
    },
    2: {
        title: 1,
        genre: 1,
        synopsis: 1,
        n_chapters: 1,
        imgCollection: 1,
        rating: 1,
        writer_id: 1,
        artist_id: 1,
        type: 1,
        themes: 1,
        genres: 1,
        nsfw: 1,
        status: 1,
        languages: 1,
        likes: 1,
    },
};

const read_projection = {
    0: {
        title: 1,
        genre: 1,
        synopsis: 1,
        n_chapters: 1,
        chapters: 1,
        status: 1,
        writer_id: 1,
        artist_id: 1,
        type: 1,
        rating: 1,
        themes: 1,
        languages: 1,
        genres: 1,
        nsfw: 1,
        imgCollection: 1,
        likes: 1,
    },
    1: {
        _id: 1,
        updatedAt: 1,
        createdAt: 1,
        type: 1,
        title: 1,
        genre: 1,
        synopsis: 1,
        n_chapters: 1,
        chapters: 1,
        languages: 1,
        nsfw: 1,
        artist_id: 1,
        writer_id: 1,
        status: 1,
        rating: 1,
        scan_id: 1,
        likes: 1,
        themes: 1,
        genres: 1,
        __v: 1,
        imgCollection: 1,
    },
    2: {
        title: 1,
        genre: 1,
        synopsis: 1,
        n_chapters: 1,
        chapters: 1,
        type: 1,
        imgCollection: 1,
        rating: 1,
        writer_id: 1,
        artist_id: 1,
        nsfw: 1,
        status: 1,
        themes: 1,
        genres: 1,
        languages: 1,
        likes: 1,
    },
};

async function store(req, res) {
    const {
        title,
        synopsis,
        writer_id,
        artist_id,
        type,
        genres,
        themes,
        n_chapters,
        status,
        languages,
        nsfw,
    } = req.body;

    const new_token = req.new_token ? req.new_token : null;
    req.new_token = null;

    let scan_id = decrypt(req.auth);

    const imgCollection = req.files.map(x => ({
        mimetype: x.mimetype,
        filename: x.filename,
        size: x.size,
    }));
    const deleteFiles = () => {
        Object.keys(req.files).forEach(i => {
            let file = req.files[i];
            fs.unlinkSync(
                folderName + 'mangas/' + title + '/covers/' + file.filename,
            );
        });
    };

    req.auth = null;
    const manga = new Manga({
        imgCollection: imgCollection,
        title: title,
        synopsis: synopsis,
        n_chapters: n_chapters,
        status: status,
        languages: languages,
        genres: genres,
        themes: themes,
        nsfw: nsfw,
        type: type,
        scan_id: scan_id,
        writer_id: writer_id,
        artist_id: artist_id,
        //comments?
    });
    if (process.env.NODE_ENV !== 'test') {
        const scan = await User.findById(scan_id);

        if (!scan) {
            deleteFiles();

            return res.jsonNotFound(
                null,
                getMessage('manga.error.scan_id'),
                null,
            );
        }

        const doesMangaExist = await Manga.exists({ title: title });

        if (doesMangaExist) {
            deleteFiles();
            return res.jsonBadRequest(
                null,
                getMessage('manga.error.duplicate'),
                new_token,
            );
        }

        const artist = await Author.findById(artist_id);

        if (!artist || !artist.types.includes('artist')) {
            deleteFiles();

            return res.jsonNotFound(
                null,
                getMessage('manga.error.artist'),
                null,
            );
        }

        const writer = await Author.findById(writer_id);

        if (!writer || !writer.types.includes('writer')) {
            deleteFiles();
            return res.jsonNotFound(
                null,
                getMessage('manga.error.writer'),
                null,
            );
        }

        manga
            .save()
            .then(result => {
                scan.mangas.push(manga._id);
                artist.works.push(manga._id);
                writer.works.push(manga._id);
                artist
                    .save()
                    .then(() => {})
                    .catch(err => {});
                writer
                    .save()
                    .then(() => {})
                    .catch(err => {});
                scan.save()
                    .then(() => {
                        return res.jsonOK(
                            result,
                            getMessage('manga.save.success'),
                            new_token,
                        );
                    })
                    .catch(err => {
                        console.log(err);
                        return res.jsonServerError(null, null, err);
                    });
            })
            .catch(err => {
                console.log(err);
                deleteFiles();
                return res.jsonServerError(null, null, err);
            });
    } else {
        manga
            .save()
            .then(result => {
                return res.jsonOK(
                    result,
                    getMessage('manga.save.success'),
                    new_token,
                );
            })
            .catch(err => {
                console.log(err);
                deleteFiles();
                return res.jsonServerError(null, null, err);
            });
    }
}

async function findOne(req, res) {
    const { title, manga_id } = req.query;
    const new_token = req.new_token ? req.new_token : null;
    req.new_token = null;

    let role;

    role = req.role ? decrypt(req.role) : 0;
    req.role = null;

    if (manga_id) {
        const manga = await Manga.findById(manga_id)
            .select(read_projection[role])
            .exec();
        return res.jsonOK(
            manga,
            getMessage('manga.findone.success'),
            new_token,
        );
    } else if (title) {
        const manga = await Manga.find({
            title: { $regex: title, $options: 'i' },
        })
            .select(read_projection[role])
            .exec();
        return res.jsonOK(
            manga,
            getMessage('manga.findone.success'),
            new_token,
        );
    } else {
        return res.jsonBadRequest(null, null, null);
    }
}

async function list(req, res) {
    const { genre, scan_id, title, type, writer_id, artist_id, recent } =
        req.query;
    const new_token = req.new_token ? req.new_token : null;
    req.new_token = null;

    let role;

    role = req.role ? decrypt(req.role) : 0;
    req.role = null;

    let docs = [];
    if (recent) {
        const search = type ? { type: type } : {};
        (
            await Manga.find(search)
                .sort('updatedAt')
                .select({ imgCollection: 1, title: 1, updatedAt: 1 })
        ).forEach(function (doc) {
            let temp = {
                _id: doc._id,
                imgCollection: doc.imgCollection,
                title: doc.title,
                updatedAt: doc.updatedAt,
                chapters: [],
            };
            Chapter.find({ manga_id: doc._id })
                .sort('updatedAt')
                .select({ number: 1, _id: 0 })
                .then(chapters => {
                    if (chapters.length !== 0) {
                        chapters.forEach(function (chap) {
                            temp.chapters.push({ number: chap.number });
                        });
                    }
                })
                .catch(err => {
                    return res.jsonServerError(null, null, err);
                });
            docs.push(temp);
        });
    } else {
        const search = genre
            ? { genre: genre }
            : writer_id
            ? { writer_id: writer_id }
            : type
            ? { type: type }
            : artist_id
            ? { artist_id: artist_id }
            : title
            ? { title: { $regex: title, $options: 'i' } }
            : scan_id
            ? { scan_id: scan_id }
            : {};
        (
            await Manga.find(search)
                .sort('updatedAt')
                .select(list_projection[role])
        ).forEach(function (doc) {
            docs.push(doc);
        });
    }

    if (docs.length === 0) {
        return res.jsonNotFound(
            docs,
            getMessage('manga.list.empty'),
            new_token,
        );
    } else {
        docs.forEach(function (doc) {
            doc.user = undefined;
        });
        return res.jsonOK(
            docs,
            getMessage('manga.list.success') + docs.length,
            new_token,
        );
    }
}

async function update(req, res) {
    const { writer_id, artist_id, manga_id } = req.body;
    const new_token = req.new_token ? req.new_token : null;
    req.new_token = null;

    let scan_id = decrypt(req.auth);

    const artist = artist_id ? await Author.findById(artist_id) : null;

    if (artist_id && (!artist || !artist.types.includes('artist')))
        return res.jsonBadRequest(null, getMessage('manga.error.artist'), null);

    const writer = writer_id ? await Author.findById(writer_id) : null;

    if (writer_id && (!writer || !writer.types.includes('writer')))
        return res.jsonBadRequest(null, getMessage('manga.error.writer'), null);

    Manga.updateOne({ _id: manga_id, scan_id: scan_id }, req.body)
        .then(manga => {
            if (artist_id !== manga.artist_id) {
                let cloneData = artist.works.filter(function (work_id) {
                    return manga_id.toString() !== work_id.toString();
                });
                //update artist document
                artist.works = cloneData;
                artist
                    .save()
                    .then(answer => {})
                    .catch(err => {
                        console.log(err);
                    });
            }

            if (writer_id !== manga.writer_id) {
                let cloneData = writer.works.filter(function (work_id) {
                    return manga_id.toString() !== work_id.toString();
                });
                //update writer document
                writer.works = cloneData;
                writer.updatedAt = Date.now();
                writer
                    .save()
                    .then(answer => {})
                    .catch(err => {
                        console.log(err);
                    });
            }

            return res.jsonOK(
                null,
                getMessage('manga.update.success'),
                new_token,
            );
        })
        .catch(err => {
            console.log(err);
            return res.jsonServerError(null, null, err);
        });
}

async function remove(req, res) {
    const { manga_id } = req.query;
    const manga = await Manga.findById(manga_id);

    const new_token = req.new_token ? req.new_token : null;
    req.new_token = null;

    const scan_id = decrypt(req.auth);
    req.auth = null;

    if (manga) {
        if (manga.scan_id.toString() === scan_id) {
            const mangas = await Manga.deleteMany({ _id: manga_id });
            //console.log(mangas)

            // update writer and artist documents
            if (mangas.n === 0)
                return res.jsonNotFound(
                    mangas,
                    getMessage('manga.notfound'),
                    new_token,
                );

            const scan = await User.findById(scan_id);

            scan.mangas = scan.mangas.filter(function (_id) {
                return _id.toString() !== manga_id.toString();
            });

            scan.save(function (err) {
                // yet another err object to deal with
                if (err) {
                    return res.jsonServerError(null, null, err);
                }
            });

            /*(await Chapter.find({manga_id: manga_id})).forEach(function (doc){
				doc.imgCollection.forEach(function (page){                            
					fs.unlinkSync('uploads/' + manga.title + "/"+ page.filename)  
				})                      
			});
			*/

            const writer = await Author.findById(manga.writer_id);

            writer.works = writer.works.filter(function (_id) {
                return _id.toString() !== manga_id.toString();
            });

            writer.save(function (err) {
                // yet another err object to deal with
                if (err) {
                    return res.jsonServerError(null, null, err);
                }
            });

            const artist = await Author.findById(manga.artist_id);

            artist.works = artist.works.filter(function (_id) {
                return _id.toString() !== manga_id.toString();
            });

            artist.save(function (err) {
                // yet another err object to deal with
                if (err) {
                    return res.jsonServerError(null, null, err);
                }
            });

            const chapters = await Chapter.deleteMany({ manga_id: manga_id });

            let dir = folderName + 'mangas/' + manga.title;

            fs.rmdir(dir, { recursive: true }, err => {
                if (err) {
                    console.log(err);
                }
            });

            fs.rmdirSync(dir, { recursive: true });

            return res.jsonOK(
                {
                    'mangas affected': mangas.deletedCount,
                    'chapters affected': chapters.deletedCount,
                },
                null,
                new_token,
            );
        }

        return res.jsonUnauthorized(null, null, null);
    }

    return res.jsonBadRequest(null, getMessage('manga.notfound'), new_token);
}

export default { store, findOne, list, update, remove };
