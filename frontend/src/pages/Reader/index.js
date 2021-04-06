import React, {useState} from 'react';

import './styles.css';
import banner from "../../assets/banner_scan.png"

export default function Reader(){

    const dir = ""

    const [currentPage, setCurrentPage] = useState({
        id: 0,
        path:  dir + 'banner_scan.png',
    },);  
    
    var imagePath = [];
    
    function generatePath(someImageName) {
        return require(`../../assets/${someImageName}`);
    }

    function getPaths(){
        let temp = [ {
            id: 0,
            path: generatePath("banner_scan.png")
        }];

        for(var i = 1; i < 49; i++){
            if (i < 10){
                temp.push({
                    id: i, 
                    path: generatePath(`cap/0${i}.jpg`)
                   
                });                
            }               
            else {
                temp.push({
                    id: i, 
                    path:  generatePath(`cap/${i}.jpg`)
                })
            }
        imagePath = temp
        }
    }
                   
    
    function nextPage(){    
        getPaths()
        imagePath.forEach((obj, index) => {
            if(obj.id === currentPage.id){
                console.log(imagePath.length)
                console.log(index)
                if(imagePath.length === index+1){

                } else{
                    setCurrentPage(imagePath[index+1])
                }
                
            }
        })
        console.log(currentPage.path)
     
    }

    function prevPage(){    
        getPaths();
        imagePath.forEach((obj, index) => {
            if(obj.id === currentPage.id){
                console.log(imagePath.length)
                console.log(index)
                if(index === 0){

                } else{
                    setCurrentPage(imagePath[index-1])
                }
                
            }
        })
        console.log(currentPage.path)
     
    }

    return <>   
        <div className="reader">
            <div className="header-board">

                    <div className="title">
                        Rental Onii-chan!
                    </div>
                    <div className="controllers">
                        <button className='button'>◄◄</button>
                        <div className="chapters"> Chapter #06 </div>
                        <button className='button'>►►</button>
                   
                   
                    </div>
                    <div className="controllers">
                        <button className='button' onClick= {() => prevPage()}>prev</button>
                        <div className="pages-list"> </div>
                        <div className="version"></div>
                        <div className="viewToggle"></div>
                        <button className='button' onClick={() => nextPage()}>next</button>
                   
                   
                    </div>
            </div>



            <div className='board'>       


                <img className='page' src={currentPage.path} alt={currentPage.id} onClick={() => nextPage()}/>
            </div>


        </div>
      
        

    </>
}