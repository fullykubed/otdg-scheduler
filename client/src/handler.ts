import * as XLSX from 'xlsx';
import * as moment from 'moment';


/************************
 * Created by Jack Langston on 1/2/18
 *
 * This file defines the logic for
 *
 * (1) Converting a binary string representing an Excel workbook into a manipulable Javascript object
 * (2) Extracting the parameters and input from OTDG schedule workbook
 * (3) Creating a schedule from the above input
 * (4) Converting the JS object into a base64 dataURL that can be downloaded by the user as an Excel workbook
 ************************/


const options = {

    //inputs selection options
    parameterSheet: 'Schedule_Code',
    salesAliasSheet: 'Sales_Alias',
    inputSheet: 'Potential',
    inputColumns : {
        salesPerson: 1,
        type: 2,
        client: 3,
        lot: 6,
        presentationDate: 11,
        shotGrade: 14,
        buildType: 15
    },

    //output formatting options
    defaultSalesPerson: 'Not Assigned',
    defaultShotGrade: 'Not Assigned',
    defaultBuildType: 'Not Assigned',
    outputHeaders : [
        'Lot',
        'Client',
        'Salesperson',
        'Type',
        'Shot Grade',
        'Build Type'
    ],
    outputDateFormat: "MM/DD/YYYY",


    //input converters
    shotGradeConverter: (input: string) => {
      switch(input.toLocaleLowerCase().trim()){
          case 'y':
              return 'Yes';
          case 'n':
              return 'No';
          case '':
              return options.defaultShotGrade;
          default:
              return 'Unknown Shot Grade Type';
      }
    },


    buildTypeConverter: (input: string) => {
        switch(input.toLocaleLowerCase().trim()) {
            case 's':
                return 'Signature';
            case 't':
                return 'Traditional';
            case 'w':
                return 'White Glove';
            case '':
                return options.defaultBuildType;
            default:
                return 'Unknown Build Type';
        }
    },

    typeConverter: (typeInput: string, parameters: Parameters) => {
        typeInput = typeInput.toLowerCase().trim();

        for (let type in parameters.types){
            if (typeInput === type || typeInput === parameters.types[type].alias){
                return type;
            }
        }
        return parameters.defaultType;
    },

    salesPersonConverter: (person:string, parameters: Parameters) => {
        person = person.trim();
        for (let alias in parameters.salesPeople){
            if (person.toLocaleLowerCase() === alias) {
                return parameters.salesPeople[alias];
            }else if(person.toLocaleLowerCase() === parameters.salesPeople[alias].toLowerCase()){
                return person;
            }
        }
        return options.defaultSalesPerson;
    },


    //comparators
    typeComparatorFactory : (parameters: Parameters) => {
        return (type1:string, type2: string) => {
            return parameters.types[type1].order - parameters.types[type2].order;
        }
    },

    presentationDateComparator: (date1: any, date2: any) => {
        if(date1.isBefore(date2)){
            return -1;
        }else if(date2.isBefore(date1)){
            return 1;
        }else{
            return 0;
        }
    }
};

/************************
 * Entry Point
 ************************/
export function process(binary){
    let workbook = XLSX.read(binary, {type: 'binary' });

    const parameters = readParameters(workbook);
    const inputs = readInputs(workbook, parameters);

    const output = createSchedule(inputs, parameters);
    return createOutput(output, parameters);
}


/************************
 * Reading the User Input
 ************************/

//Data Models

interface Milestone {
    name: string,
    numDays?: number,
    specificDay?: number,
    date?: any
}

interface TypeParameters {
    alias: string,
    order: number,
    milestones: Milestone[]
}


interface Parameters {
    defaultType: string,
    types: {
        [type: string]: TypeParameters
    }
    salesPeople: {
        [alias: string] : string //(mapping of aliases to names)
    }
}

interface Inputs {
    [lot: string] : {
        type: string,
        salesPerson: string,
        client: string,
        presentationDate: any,
        shotGrade: string,
        buildType: string
    }
}



//reads the parameter page
function readParameters(workbook: XLSX.WorkBook):Parameters{

    /*******************************
     * GET THE MILESTONE DATA
     *******************************/

    //convert to 2D array
    const sheet = workbook.Sheets[options.parameterSheet];
    const rawData = XLSX.utils.sheet_to_json(sheet, {header: 1, defval: ""});

    //if no rows, then we can assume this worksheet does not exist
    if(!rawData[0]) throw {name: "Invalid Input", message: `Sheet ${options.parameterSheet} does not exist in the workbook.`};

    //get the milestone headers
    const milestones = (<any[]>rawData[0]).filter(val => {if (typeof val === 'string') return val});
    const types = rawData.slice(2).map(val => val[0].toLowerCase());
    let parameters:Parameters = {defaultType: '', types: {}, salesPeople: {}};

    //make sure that we have some input
    if (!milestones.length || !types.length) throw {name: "Invalid Input", message: `Not enough milestones or types. ${options.parameterSheet}.`};

    //parse the array
    types.forEach((type, typeIndex) => {
        if(type) {
            let row = typeIndex + 2;

            //the first row should be the default type
            if (typeIndex === 0) {
                parameters['defaultType'] = type;
            }

            //initialize the object
            parameters["types"][type] = {
                milestones: [],
                order: typeIndex,
                alias: rawData[row][1].toLowerCase()
            };

            //add the milestone data
            milestones.forEach((milestone, milestoneIndex) => {
                let col = milestoneIndex * 2 + 2;


                const numDays = parseInt(rawData[row][col]);
                if (!numDays || numDays < 0)
                    throw {name: "Invalid Input", message: `Day offset is not a positive number. Sheet ${options.parameterSheet}. Cell (${row},${col}). Given "${rawData[row][col]}".`};

                const specificDay = parseInt(rawData[row][col + 1]);
                if (rawData[row][col + 1].trim() !== '' && (!specificDay || (specificDay <= 0 || specificDay > 7)))
                    throw {name: "Invalid Input", message: `Specific Day is not a number 1-7. Sheet ${options.parameterSheet}. Cell (${row},${col+1}). Given "${rawData[row][col+1]}".`};

                parameters["types"][type]["milestones"].push({
                    name: milestone,
                    numDays: numDays,
                    specificDay: specificDay
                });
            })
        }
    });

    /*******************************
     * SALESPEOPLE ALIASES
     *******************************/
    const salesPeopleAliasData = XLSX.utils.sheet_to_json(workbook.Sheets[options.salesAliasSheet], {header: 1, defval: ""});

    //if no rows, then we can assume this worksheet does not exist
    if(!salesPeopleAliasData[0]) throw {name: "Invalid Input", message: `Sheet ${options.salesAliasSheet} does not exist in the workbook.`};

    const aliases = salesPeopleAliasData.slice(1).map(val => [val[0].toLowerCase().trim(), val[1]]);

    aliases.forEach((row) => {
       if(row[0] !== ''){
           parameters.salesPeople[row[0]] = row[1];
       }
    });

    return parameters;
}

//reads the sales database
function readInputs(workbook: XLSX.WorkBook, parameters:Parameters): Inputs{

    //convert to 2D array
    const sheet = workbook.Sheets[options.inputSheet];
    const rawData = XLSX.utils.sheet_to_json(sheet, {header: 1, defval: "", dateNF: 14});

    if(!rawData[0]) throw {name: "Invalid Input", message: `Sheet ${options.inputSheet} does not exist in the workbook.`};

    //select only the rows that have valid presentation dates and make those dates instances of the moment library
    const mustSchedule = rawData.filter((row) => {
        return !((<any[]>row).length <= options.inputColumns.presentationDate || row[options.inputColumns.presentationDate].trim() === '')
    }).map((row) => {
        row[options.inputColumns.presentationDate] = moment(row[options.inputColumns.presentationDate], ["M/D/YY", "M/D"]);
        return row;
    }).filter((row) => {
        const date = row[options.inputColumns.presentationDate];
        return date.isValid() && date.isAfter(moment()) && date.isBefore(moment().add(2, 'y'));
    });

    let inputs = {};

    mustSchedule.forEach((row) => {
        inputs[row[options.inputColumns.lot].trim()] = {
            type: options.typeConverter(row[options.inputColumns.type], parameters),
            salesPerson: options.salesPersonConverter(row[options.inputColumns.salesPerson], parameters),
            presentationDate: row[options.inputColumns.presentationDate],
            client: row[options.inputColumns.client].trim(),
            shotGrade: options.shotGradeConverter(row[options.inputColumns.shotGrade]),
            buildType: options.buildTypeConverter(row[options.inputColumns.buildType])
        }
    });

    return inputs;
}

/************************
 * Creating the schedule from the inputs
 ************************/

//data models

interface Schedule{
    [lot: string] : {
        type: string,
        salesPerson: string,
        client: string,
        shotGrade: string,
        buildType: string,
        presentationDate: any,
        milestones: Milestone[]
    }
}



/***************************
 * Takes the inputs and the parameters and returns an object with all of the properties of 'input'
 * as well as an extra 'milestone' property that contains an array of milestone objects:
 *
 *  {
 *      name: 'MilestoneName'
 *      date: moment object
 *  }
 ****************************/
function createSchedule(inputs:Inputs, parameters:Parameters): Schedule{

    let output: Schedule = {};

    for (const lot in inputs) {


        //fill with the existing data
        let temp = {
            ...inputs[lot],
            milestones: []
        };

        //assign the milestone dates
        parameters.types[temp.type].milestones.forEach((milestone) => {

            if(milestone.specificDay){
            //if the milestone needs to occur on a specific day of the week

                temp.milestones.push({
                    name: milestone.name,
                    date: subtractWeekdaysUntilDay(temp.presentationDate, milestone.numDays, milestone.specificDay)
                });

            //othewise
            }else{
                temp.milestones.push({
                    name: milestone.name,
                    date: subtractWeekdays(temp.presentationDate, milestone.numDays)
                });
            }


        });

        output[lot] = temp;
    }

    return output;


}


/************************
 * Convert the schedule from above into the data string
 ************************/

function createOutput(output: Schedule, parameters: Parameters){
    let workbook = XLSX.utils.book_new();
    const data = arrayFromOutput(output, parameters);
    let ws = XLSX.utils.aoa_to_sheet(data);
    XLSX.utils.book_append_sheet( workbook, ws, "Schedule");
    return XLSX.write(workbook, { bookType:'xlsx', bookSST:false, type:'base64' });
}

//creates a 2D array from the JS object
function arrayFromOutput(output:Schedule, parameters: Parameters){

    //add the header
    let headerRow = [
        ...options.outputHeaders,
        ...output[Object.keys(output)[0]].milestones.map(milestone => milestone.name),
        'Presentation Date'
    ];


    let formattedOutput = [];

    //add the actual data
    for(const lot in output){

        formattedOutput.push([
            lot,
            output[lot].client,
            output[lot].salesPerson,
            output[lot].type,
            output[lot].shotGrade,
            output[lot].buildType,
            ...(output[lot].milestones.map((milestone)=>{
                return milestone.date;
            })),
            output[lot].presentationDate
        ]);
    }


    //sort the output
    let typeComparator = options.typeComparatorFactory(parameters);
    let comparatorFn = (row1: any[], row2: any[]) => {
        let typeComparision = typeComparator(row1[3], row2[3]);
        if(typeComparision == 0){
            return options.presentationDateComparator(row1[row1.length - 1], row2[row2.length - 1]);
        }else{
            return typeComparision;
        }
    };
    formattedOutput.sort(comparatorFn);


    //convert the dates to strings
    formattedOutput = formattedOutput.map((row: any[]) => {
        return row.map((val: any, index: number) => {
            if(index > 5){
                return val.format(options.outputDateFormat);
            }else{
                return val;
            }
        });
    });

    //adds the headers
    formattedOutput.unshift(headerRow);

    return formattedOutput;
}



/************************
 * Utility Functions
 ************************/

function subtractWeekdays(date, days) {
    let newdate = moment(date); // use a clone
    while (days > 0) {
        newdate = newdate.subtract(1, 'days');
        // decrease "days" only if it's a weekday.
        if (newdate.isoWeekday() !== 6 && newdate.isoWeekday() !== 7) {
            days -= 1;
        }
    }
    return newdate;
}


function subtractUntilDay(date, isoWeekdayNum){
    let newdate = moment(date); // use a clone
    while (newdate.isoWeekday() != isoWeekdayNum) {
        newdate = newdate.subtract(1, 'days');
    }
    return newdate;
}

function subtractWeekdaysUntilDay(date, days, isoWeekdayNum){
    return subtractUntilDay(subtractWeekdays(date, days), isoWeekdayNum);
}





