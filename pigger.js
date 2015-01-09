Rows = new Mongo.Collection("rows");
Cats = new Mongo.Collection("cats");

if (Meteor.isClient) {

    Meteor.subscribe("rows");
    Meteor.subscribe("cats");

    Template.rows.rendered = function() {
        $('.ui.accordion').accordion();
    };

    Template.editCat.rendered = function() {
        $('.edit').popup();
        $('.ui.dropdown').dropdown({transition: 'drop'});
    }

    Template.body.helpers({
        cats: function() {//Returns the cats
            return Cats.find({}, {fields: {cat: 1, per: 1}});
        }
    });

    Template.rows.helpers({
        rows: function() {
            return Rows.find({}, {sort: {createdAt: -1}});
        },

        columns: function() {
            // the context is a cat
            var result = _.values(this.data);
            return result;
        }
    });

    Template.body.events({
        "submit .new-row": function(event) {
            Meteor.call("addRow", event.target.amount.value, event.target.text.value);

            event.target.amount.value = "";
            event.target.text.value = "";

            return false;
        },

        "submit .new-cat": function(event) {
            Meteor.call("addCat", event.target.cat.value, event.target.per.value);

            event.target.cat.value = "";
            event.target.per.value = "";

            return false;
        },

        "submit .edit-row": function(event) {
            var action = event.target.action.value;
            var amount = event.target.editAmount.value;
            var editCat = event.target.cat.value;
            var reason = event.target.reason.value;
            var currentRow = Rows.findOne({owner: Meteor.userId()}, {sort: {createdAt: -1}});
            var cats = Cats.find({owner: Meteor.userId()}, {fields: {cat: 1}}).fetch();

            if (action == "+") {
                amount = parseInt(currentRow['data'][editCat]) + parseInt(amount);
            }
            else {
                amount = parseInt(currentRow['data'][editCat]) - parseInt(amount);
            }

            var catData = {};

            var i = 0;
            _.map(currentRow.data, function(cat) {
                var currentCat = cats[i]['cat'];
                if (currentCat == editCat) {
                    catData[editCat] = amount;
                }
                else {
                    catData[currentCat] = currentRow['data'][currentCat];
                }

                i++;
            });

            Meteor.call("editRow", reason, catData);

            return false;
        },

        "submit .delete-row": function(event) {
            var id = this._id;

            swal({
                    title: "Are you sure?",
                    text: "We will delete this row and everything after it (from this row to the latest row).",
                    type: "warning",
                    showCancelButton: true,
                    confirmButtonColor: "#DD6B55",
                    confirmButtonText: "Yes, delete it!",
                    closeOnConfirm: false,
                    closeOnCancel: false
                },
                function(isConfirm) {
                    if (isConfirm) {
                        Meteor.call("deleteRows", id);
                        swal("Deleted!", "The specified row(s) have been deleted.", "success");
                    }
                    else {
                        swal("Cancelled", "Never mind.", "error");
                    }
                });

            return false;
        },

        "submit .delete-cat": function(event) {
            var id = this._id;

            swal({
                    title: "Are you sure?",
                    text: "We will delete this category. All the money currently in it will be moved to your other categories.",
                    type: "warning",
                    showCancelButton: true,
                    confirmButtonColor: "#DD6B55",
                    confirmButtonText: "Yes, delete it!",
                    closeOnConfirm: false,
                    closeOnCancel: false
                },
                function(isConfirm) {
                    if (isConfirm) {
                        Meteor.call("deleteCat", id);
                        swal("Deleted!", "The specified category has been deleted.", "success");
                    }
                    else {
                        swal("Cancelled", "Never mind.", "error");
                    }
                });

            return false;
        }
    });

    Accounts.ui.config({
        passwordSignupFields: "USERNAME_AND_OPTIONAL_EMAIL" //Use usernames instead of emails
    });
}

if (Meteor.isServer) {
    Meteor.publish("rows", function() {
        return Rows.find({owner: this.userId });
    });
    Meteor.publish("cats", function() {
        return Cats.find({owner: this.userId });
    });
}

Meteor.methods({
    addRow: function(amount, text) {
        var currentRow = Rows.findOne({owner: Meteor.userId()}, {sort: {createdAt: -1}});

        var row = Rows.insert({ //First insert a base row, then later insert the rest
            owner: Meteor.userId(),
            text: text,
            createdAt: new Date()
        });

        var cats = Cats.find({owner: Meteor.userId()}, {fields: {cat: 1, per: 1}});

        var catData = {};

        cats.forEach(function(cats) { //Generates data for the rest of document
            var currentCat = cats['cat'];
            var currentPer = cats['per'];

            if (currentRow == undefined) {
                var currentAmount = amount*currentPer;
            }
            else {
                var currentAmount = amount*currentPer + currentRow.data[currentCat];
            }

            currentAmount = Math.round(100 * currentAmount) / 100;
            catData[currentCat] = currentAmount;
        });

        Rows.update( //Inserts the rest of document
            { _id: row },
            { $set: { data: catData } }
        );
    },

    addCat: function(cat, per) {
        Cats.insert({owner: Meteor.userId(), cat: cat, per: per})
        eval('Rows.update({owner: Meteor.userId()}, {$addToSet: {"data.'+cat+'": 0}}, {multi: true});');
    },

    editRow: function(reason, catData) {
        Rows.insert({
            owner: Meteor.userId(),
            text: reason,
            createdAt: new Date(),
            data: catData
        });
    },

    deleteRows: function(id) {
        var initalRow = Rows.findOne({_id: id});
        var now = new Date().getTime();

        Rows.remove( {createdAt: {$gte: initalRow['createdAt']}, owner: Meteor.userId() } );
    },

    deleteCat: function(id) {
        var cat = Cats.findOne({_id: id});
        var cat = cat.cat;

        var lastRow = Rows.findOne({owner: Meteor.userId()}, {sort: {createdAt: -1}});
        var lastRowCatAmount = lastRow['data'][cat];

        Cats.remove({_id: id});
        var editRows = eval('Rows.update({"data.'+cat+'": {$exists: true}}, {$unset: {"data.'+cat+'": ""}}, {multi: true});');

        Meteor.call("addRow", lastRowCatAmount, "Removed category "+cat);
    }
});
