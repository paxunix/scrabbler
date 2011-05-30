// $Id: scrabbler.js,v 1.1 2003/11/16 18:17:54 rsh Exp rsh $


// Object definitions


// Constructor for object to manage dictionary data.  Maintains a list of words and their definitions.
function DictData(DictView)
{
    this.Words = new Array;
    this.View = DictView;
}   // DictData (constructor)


DictData.prototype =
{
    Add: function(MainWord, OtherWords, Definition)
    {
        var Hash = {
            words:  new Array,
            data:  Definition,
        };

        Hash.words.push(MainWord.toLowerCase(), OtherWords.toLowerCase().split(/\s\+/));
        this.Words.push(Hash);

        this.View.InsertRow(-1, Hash);
    },   // DictData.Add


    length getter: function()
    {
        return this.Words.length;
    },  // length (getter)


    GetRow: function(i)
    {
        return this.Words[i];
    },  // SelData.GetRow


    Clear: function()
    {
        while (this.Words.length > 0)
            this.Words.pop();

        this.View.Redraw();
    },  // DictData.Clear
}


function SelData(SelView)
{
    this.Words = new Array;
    this.View = SelView;
}


SelData.prototype =
{
    Add: function(Word)
    {
        this.Words.push(Word);
        this.View.InsertRow(-1, Word);
    },   // SelData.Add


    length getter: function()
    {
        return this.Words.length;
    },  // length (getter)


    GetRow: function(i)
    {
        return this.Words[i];
    },  // SelData.GetRow


    Clear: function()
    {
        while (this.Words.length > 0)
            this.Words.pop();

        this.View.Redraw();
    },  // SelData.Clear
}


// Base table view object
function TableView(TableElement)
{
    this.Table = TableElement || "ERROR:  no HTML Table Element specified.";
    this.Model = undefined;
}


TableView.prototype = 
{
    SetModel:  function(DataModel)
    {
        this.Model = DataModel;
    },   // SetModel


    // Redraw the table from scratch (empty then fill).
    Redraw: function()
    {
        this.Clear();

        var i;
        for (i = 0; i < this.Model.length; ++i)
            this.InsertRow(-1, this.Model.GetRow(i))
    },


    Clear: function()
    {
        this.Table.innerHTML = "";
    },


    ReclassRows: function(ClassName)
    {
        var i;
        for (i = 0; i < this.Model.length; ++i)
            this.Table.rows.item(i).className = ((i + 1) % 2) ? "" : ClassName;
    },
}


// Constructor for object that knows how to display dictionary data in a table.
function DictView(TableElement)
{
    this.base = TableView;
    this.base(TableElement);
}


DictView.prototype = new TableView;

// Insert a row at Offset into the table.  If Offset==-1, append the row.  The row's data is a single element
// from the data hash.  Note that the class of the even rows is different from the odd rows (1-based).
DictView.prototype.InsertRow = 
function(Offset, DictDataElement)
{
    var RowElement = this.Table.insertRow(Offset);

    RowElement.innerHTML = "<td class='wordlist'><span class='clickword'>" + DictDataElement.words.join("</span> <span class='clickword'>") + "</span></td><td class='worddef'>" + DictDataElement.data + "</td>";
    // XXX: have to either add a click handler for the row that checks to see if a child clickword was clicked,
    // or handlers for every clickword span.

    // Since the row may have been inserted instead of appended the (1-based) even rows may now be the odd rows.
    this.ReclassRows("evenwordrow");
}


// Global Functions


//////////////////////////////////////////
// Function:
//      ClearAll
// Parameters:
//      none
// Returns:
//      nothing
// Purpose:
//      Clear all form data and also clear data within tables.  Intended to reset things to initial empty state.
//////////////////////////////////////////
function ClearAll()
{
    document.forms[0].reset();

    g_DictData.Clear();
    g_SelData.Clear();
}   // ClearAll


//////////////////////////////////////////
// Function:
//      Lookup
// Parameters:
//      none
// Returns:
//      nothing
// Purpose:
//      Submit the word from the form to the server and populate the word list frame.
//////////////////////////////////////////
function Lookup()
{
    var letters = document.forms[0].letters.value;

    if (letters == "")
    {
        alert("You must first enter a list of letters or a word.");
        return;
    }

    ProcessDoc(ParseHTML(GetFormResults(true, letters, document.forms[0].exact.checked)));
}   // Lookup


//////////////////////////////////////////
// Function:
//      GetFormResults
// Parameters:
//      IsDictLookup    - true if this is a dictionary lookup
//      Str             - word to lookup if this is a dictionary lookup, string of letters if this is a wordbuilder
//                        request.
//      IsDictExact     - only used for dictionary lookups.  True means look for the exact word given in Str.
// Returns:
//      Text string representing the HTML document from the server.
// Purpose:
//      Submit a request to the Scrabble website to either lookup a word or word substring or to find a word given a
//      string of letters.
//////////////////////////////////////////
function GetFormResults(IsDictLookup, Str, IsDictExact)
{
    var Request = new XMLHttpRequest;
    var DictPOSTurl = "http://www.hasbro.com/scrabble/pl/page.tools/dn/home.cfm";

    netscape.security.PrivilegeManager.enablePrivilege("UniversalBrowserRead");

    Request.open("POST", DictPOSTurl, false, null, null);
    Request.setRequestHeader("Content-Type", "application/x-www-form-urlencoded");
    Request.send("type=" + (IsDictLookup ? "dictionary" : "wordbuilder") + "&" +
                 "Word=" + Str +
                 (IsDictExact ? "&exact=on" : ""));

    return Request.responseText;
} // GetFormResults


//////////////////////////////////////////
// Function:
//      ParseHTML
// Parameters:
//      Str     - string containing a serialized HTML document
// Returns:
//      Document node root of the document created from Str.
// Purpose:
//      Transform an HTML string into a DOM document.
//////////////////////////////////////////
function ParseHTML(Str)
{
    var Range = document.createRange();
    Range.selectNodeContents(document.body.lastChild);
    var DocFrag = Range.createContextualFragment(Str);
    Range.detach();

    // Since we can't directly create an HTML document from a fragment, we cheat by appending the doc fragment to an
    // empty, hidden iframe.
    var iframe = document.getElementById("dumbframe");
    iframe.contentDocument.body.appendChild(DocFrag);

    return iframe.contentDocument;
}   // ParseHTML


//////////////////////////////////////////
// Function:
//      ProcessDoc
// Parameters:
//      Doc         - DOM document of the form results.
//      DictData    - receives word data from Doc.
// Returns:
//      nothing
// Purpose:
//      Given a DOM document, pull out the data we're interested in and put it into the data model.
//////////////////////////////////////////
function ProcessDoc(Doc, DictData)
{
    // Find all nodes containing the word results from the query
    var nodes = Doc.evaluate('//b[@class = "maroon"][following-sibling::span] | //span[@class = "black12"][preceding-sibling::b]', Doc, null, XPathResult.ORDERED_NODE_ITERATOR_TYPE, null); 
    var i;

    while (i = nodes.iterateNext())
    {
        var MainWord = i;
        i = nodes.iterateNext();
        var Data = i.textContent.split(/\s*\\\s*/);

        DictData.Add(MainWord, Data[0], Data[1]);
    }
}   // ProcessDoc


// Global Data
var g_DictView;
var g_DictData;
var g_SelView;
var g_SelData;


function Main()
{
    g_DictView = new DictView(document.getElementById("wordtable"));
    g_DictData = new DictData(g_DictView);
    g_DictView.SetModel(g_DictData);

    //g_SelView = new SelView(document.getElementById("seltable"));
    //g_SelData = new SelData(g_SelView);
    //g_SelView.SetModel(g_SelData);
}   // Main
