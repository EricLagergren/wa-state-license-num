window.onload = function() {
    'use strict';

    var doc = document,
        submit = doc.getElementById("form"),
        or = doc.getElementById("or"),
        ln1 = doc.getElementById("license-num1"),
        ln2 = doc.getElementById("license-num2");

    /**
     * @constructor
     * @unrestricted
     */
    function Form(fname, mname, lname, dob) {
        this.fname = (fname || "").toUpperCase();
        this.mname = (mname || "").toUpperCase();
        this.lname = (lname || "").toUpperCase();
        this.dob   = (dob   || "");
        this.set   = true;
    }

    submit.addEventListener("submit", function(evt) {
        evt.preventDefault();
        parse_form();
    }, true);

    /**
     * Parse form and start chain of functions.
     */
    function parse_form() {
        or.innerHTML = "or, less likely:";

        var form = new Form(
                doc.getElementById("fname").value || null,
                doc.getElementById("mname").value || null,
                doc.getElementById("lname").value || null,
                doc.getElementById("dob").value   || null
        );

        var licenses = gen_license_num(form);
        
        ln1.innerHTML = licenses[0];
        ln2.innerHTML = licenses[1];
    }

    /**
     * Show any errors that may have occured, then throw an exception
     * to stop script execution.
     *
     * @throws Invalid Input Erro
     */
    function show_error() {
        // Clear "or" div.
        or.innerHTML = "";

        ln1.innerHTML = "Please correctly fill out each field.";
        ln2.innerHTML = "Note: Middle name is not reqired.";
        throw "Invalid Input";
    }

    /**
     * Generate the license number from a form object.
     * If it doesn't exist, show the user which inputs
     * they missed.
     *
     * @param  {Object} form           A Form object representing the form
     *                                 the user completed.
     * @return {Array<string>|boolean} A two-value array, containing both
     *                                 potential license numbers.
     */
    function gen_license_num(form) {
        form = form || {};

        if (!form.hasOwnProperty("set")) {
            show_error();
        }

        // Potential license strings.
        var license1 = "",
            license2 = "";

        /* Last Name Portion (LNP) is LLLLL,
            which is the first 5 letters of the person's
            last name. */
        var len = form.lname.length,
            end = len >= 5 ? 5 : len,
            LNP = form.lname.slice(0, end);

        license1 += LNP;
        license2 += LNP;

        /* Pad with asterisks if the last name is short,
            e.g. "Woo" or "Lee". */
        for ( ; end < 5; end++) {
            license1 += "*";
            license2 += "*";
        }

        // First letter of first name
        var fi = form.fname.charAt(0);

        license1 += fi;
        license2 += fi;

        // Grab middle initial (mi)
        var mi = form.mname.charAt(0) || "*";

        license1 += mi;
        license2 += mi;

        var dob = form.dob.valueAsDate || parse_date(form.dob),
            day = dob.getDate(),
            month = dob.getMonth(),
            year = dob.getFullYear();

        // Get the two-digit year (tdy), and subtract from 100.
        var tdy = (100 - +year.toString().slice(2)).toString();

        // Add zero-padding;
        if (tdy.length == 1)
            tdy = "0" + tdy;

        license1 += tdy;
        license2 += tdy;

        /* Temporary strings to hold the rest of our license #,
            since we have to insert the checksum before the rest,
            but can't compute the checksum without the rest of the
            license. */
        var temp1 = "",
            temp2 = "";

        // Month    1st 2nd     Month   1st 2nd
        // Jan      B   S       Jul     M   4
        // Feb      C   T       Aug     N   5
        // Mar      D   U       Sep     O   6
        // Apr      J   1       Oct     P   7
        // May      K   2       Nov     Q   8
        // Jun      L   3       Dec     R   9

        // dateObj.getMonth() is zero-indexed.
        var monthTable = [
            ["B", "S"], // Jan
            ["C", "T"], // Feb
            ["D", "U"], // March
            ["J", "1"], // April
            ["K", "2"], // May
            ["L", "3"], // June
            ["M", "4"], // July
            ["N", "5"], // Aug
            ["O", "6"], // Sept
            ["P", "7"], // Oct
            ["Q", "8"], // Nov
            ["R", '9']  // Dev
        ];

        temp1 += monthTable[month][0];
        temp2 += monthTable[month][1];

        // Date     Code        Date    Code        Date    Code        
        // 1        A           11      J           21      1
        // 2        B           12      K           22      2           
        // 3        C           13      L           23      3           
        // 4        D           14      M           24      4           
        // 5        E           15      N           25      5           
        // 6        F           16      W           26      6           
        // 7        G           17      P           27      7           
        // 8        H           18      Q           28      8           
        // 9        Z           19      R           29      9           
        // 10       S           20      0 (number)  30      T
        //                                          31      U

        var dayTable = [
            "A", "B", "C", // 01, 02, 03
            "D", "E", "F", // 04, 05, 06
            "G", "H", "Z", // 07, 08, 09
            "S", "J", "K", // 10, 11, 12
            "L", "M", "N", // 13, 14, 15
            "W", "P", "Q", // 16, 17, 18
            "R", "0", "1", // 19, 20, 21
            "2", "3", "4", // 22, 23, 24
            "5", "6", "7", // 25, 26, 27
            "8", "9", "T", // 28, 29, 30
            "U"            // 31
        ];

        /* day-1 because dayTable is zero-indexed and
            dateObj.getDate() isn't. */
        temp1 += dayTable[day-1];
        temp2 += dayTable[day-1];

        /* Mash our two versions together for a second
            while we iterate over the strings to calculate
            the checksums. */
        var t1 = license1 + temp1,
            t2 = license2 + temp2,
            c1 = calc_checksum(t1),
            c2 = calc_checksum(t2);

        if (c1 == -1 || c2 == -1)
            return false;

        license1 += c1.toString();
        license2 += c1.toString();

        license1 += temp1;
        license2 += temp2;

        return [license1, license2];
    }

    /**
     * Calculate the checksum of a license string
     * using the formula
     * checksum = (L1 – L2 + L3 – L4 + L5 – F + M – Y1 + Y2 – M + D) mod 10;
     *
     * @param  {string} str A license #, sans checksum
     * @return {number}     A license #'s checksum. A return of -1 
     *                      specifies an invalid character.
     */
    function calc_checksum(str) {
        var ret = 0;

        // Length of the string _should_ be 11.
        for (var i = 0; i < 11; i++) {
            var k = 0;

            switch(str.charAt(i)) {
                // Value    Letter  Letter  Letter  Letter
                // 1        A       J       
                // 2        B       K       S   
                // 3        C       L       T   
                // 4        D       M       U       *
                // 5        E       N       V   
                // 6        F       O       W   
                // 7        G       P       X   
                // 8        H       Q       Y   
                // 9        I       R       Z   

                // The fallthroughs are on purpose.
                case "A":
                case "J":
                    k = 1;
                    break;

                case "B":
                case "K":
                case "S":
                    k = 2;
                    break;

                case "C":
                case "L":
                case "T":
                    k = 3;
                    break;

                case "D":
                case "M":
                case "U":
                case "*":
                    k = 4;
                    break;

                case "E":
                case "N":
                case "V":
                    k = 5;
                    break;

                case "F":
                case "O":
                case "W":
                    k = 6;
                    break;

                case "G":
                case "P":
                case "X":
                    k = 7;
                    break;

                case "H":
                case "Q":
                case "Y":
                    k = 8;
                    break;

                case "I":
                case "R":
                case "Z":
                    k = 9;
                    break;

                default:
                    k = +str.charAt(i);
            }

            if (i === 0) {
                ret = k;
                continue;
            }

            i % 2 ? ret -= k : ret += k;
        }

        return ret % 10;
    }

    /**
     * Generate a Date object from a given string in
     * YYYY-MM-DD format.
     *
     * Stolen from http://stackoverflow.com/a/2587398/2967113
     * because dates suck.
     *
     * @param  {String} date A string representing a date in YYYY-MM-DD 
     *                       format.
     * @return {Object}      A Date Object
     */
    function parse_date(date) {
        var parts = date.split('-');

        if (parts.length < 3)
            show_error();

        return new Date(parts[0], parts[1]-1, parts[2]);
    }
};

window.onunload = function() { /* disable caching */ };