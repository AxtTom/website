import * as Mongo from 'mongodb';

class EasyMongo {
    private collection: Mongo.Collection<Mongo.Document>;

    constructor(collection: Mongo.Collection<Mongo.Document>) {
        this.collection = collection;
    }

    public get(filter: Mongo.Filter<Mongo.Document>): Promise<Mongo.WithId<Mongo.Document>> {
        return this.collection.findOne(filter);
    }
    public set(filter: Mongo.Filter<Mongo.Document>, data: Mongo.Document) {
        return this.collection.findOne(filter).then(doc => {
            if (doc) {
                this.collection.updateOne(filter, { $set: data });
            }
            else {
                if (filter.id) data.id = filter.id;
                this.collection.insertOne(data);
            }
        });
    }
    public unset(filter: Mongo.Filter<Mongo.Document>, data: Mongo.Document) {
        return this.collection.findOne(filter).then(doc => {
            if (doc) {
                this.collection.updateOne(filter, { $unset: data });
            }
        });
    }
    public remove(filter: Mongo.Filter<Mongo.Document>) {
        return this.collection.deleteOne(filter);
    }
    public has(filter: Mongo.Filter<Mongo.Document>): Promise<boolean> {
        return new Promise((resolve, reject) => {
            this.collection.findOne(filter, (err, doc) => {
                if (err) {
                    reject(err);
                }
                else {
                    resolve(doc !== null);
                }
            });
        });
        // return this.collection.findOne(filter).then(doc => doc != null); <- Don't know if this works
    }
}

export {
    EasyMongo
};