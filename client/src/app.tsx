import * as React from 'react';
import {render} from 'react-dom';
import * as Radium from 'radium';

import {process} from './handler';



/************************
 * ALL UI is contained in the below React Component
 ************************/

@Radium
class App extends React.Component<any, any> {


    constructor(props:any){
        super(props);

        this.state = {
            data: "",
            errorMessage: ""

        };

        this.processFile = this.processFile.bind(this);

    }

    /************************
     * Event handler that is fired as soon as a file is selected
     ************************/

    processFile(event){
        let reader = new FileReader();
        reader.readAsBinaryString(event.target.files[0]);
        reader.onload = (e: any) => {

            //reset the file selection form so that user can select another file
            let form:any = document.getElementById("uploader");
            form.reset();

            this.setState({data: ""}, () => {
                try {
                    this.setState({data: process(e.target.result), errorMessage: ""});
                }catch(e){
                    console.warn(e);
                    this.setState({data: "", errorMessage: e.message});
                }
            });
        };
    }

    render() {
        return (
            <div>
                <h2 style={{textAlign:"center"}}>
                    OTDG Sales Scheduler
                </h2>
                <div style={inputFormStyles.base}>
                    <form id="uploader" action="#">
                        <div className="file-field input-field">
                            <div className="btn green darken-4">
                                <span>File</span>
                                <input type="file" onChange={this.processFile} accept=".xls,.xlsm,.xlsx,.xlsa"/>
                            </div>
                            <div className="file-path-wrapper">
                                <input className="file-path validate" type="text" />
                            </div>
                        </div>
                    </form>

                </div>
                {this.state.data ?
                    <div >
                        <h5 style={[downloadButtonStyles.base, downloadButtonStyles.header]}>Completed!</h5>
                    <a className="waves-effect waves-light btn green darken-4"
                       style={downloadButtonStyles.base}
                       href={"data:application/vnd.openxmlformats-officedocument.spreadsheetml.sheet;base64," + this.state.data}
                       download="schedule.xlsx">

                        Download
                    </a>
                    </div>
                    : ""}
                {this.state.errorMessage ?
                        <div className="card-panel red" style={{textAlign:"center"}} >
                              <span className="white-text">
                                  {this.state.errorMessage}
                              </span>
                        </div>

                    : ""}
                <div style={{padding:"25px"}}>
                    <h4>Formatting Requirements</h4>
                    <ul className="browser-default">
                        <li>The file must be an Excel file.</li>
                        <li>The file must contain the worksheets "Schedule_Code", "Sales_Alias", and "Potential" containing the schedule paramaters, sales person name mappings, and inputs respectively.</li>
                    </ul>
                    <h5>Schedule_Code</h5>
                    <ul className="browser-default">
                        <li>The first column must contain the different types of sales leads.</li>
                        <li>The second column contains type aliases that may be used in place of the full type name on the "Potential" sheet.</li>
                        <li>Milestones must come in pairs of two columns.</li>
                        <ul className="browser-default">
                            <li>The first row of the pair must contain the milestone name.</li>
                            <li>The second row is ignored.</li>
                            <li>Subsequent rows contain the parameters for each sales lead type.</li>
                            <ul className="browser-default">
                                <li>Workdays Before = # of weekdays prior to the presentation date that the milestone will occur.</li>
                                <li>Specific Day = ISO number of the specific day of the week that the milestone must occer, 1 (Monday) - 7 (Sunday). Leaving this blank means that the milestone may occur on any weekday.</li>
                            </ul>
                        </ul>
                        <li>Output rows are sorted first by the the Lead Type (in the order given on the Schedule_Code sheet) and then by presenation date.</li>
                        <li>The default Lead Type is the first Lead Type on the Schedule_COde sheet.</li>
                    </ul>
                    <h5>Sales_Alias</h5>
                    <ul className="browser-default">
                        <li>The first row (headers) is ignored.</li>
                        <li>All subsequent rows are mappings between shorthand salesperson names and the full name. Either can be used on the "Potential" sheet.</li>
                    </ul>
                    <h5>Potential</h5>
                    <ul className="browser-default">
                        <li>The program will select every row that has a valid date in column L and then attempt to schedule the milestones.</li>
                        <li>It will use the following columns as inputs:</li>
                        <ul className="browser-default">
                            <li>B = Salesperson (or alias)</li>
                            <li>C = Lead Type</li>
                            <li>D = Client</li>
                            <li>G = Lot</li>
                            <li>L = Presenation Date</li>
                            <li>O = Shot Grade</li>
                            <li>P = Build Type</li>
                        </ul>
                    </ul>
                    <a className="waves-effect waves-light btn green darken-4"
                       href="/Scheduler_Example.xlsm"
                       download>
                        Download Example
                    </a>

                </div>
            </div>
        );
    }
}

/************************
 * Stylings
 ************************/

const inputFormStyles = {
    base: {
        margin: "50px auto 0 auto",
        width: "350px"
    }
};


const downloadButtonStyles = {

    base: {
        display: "block",
        margin: "10px auto",
        maxWidth: "150px",
    },
    header: {
        margin: "50px auto 0",
        textAlign: "center"
    }
};

/************************
 * Application Entry Point
 ************************/

render(
    <App/>,
    document.getElementById('root')
);




