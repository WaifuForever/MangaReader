import React, { useState, useEffect, useContext, useRef } from 'react';
import './styles.css';
import { Link } from 'react-router-dom';

import api from "../../services/api"

import { Context } from '../../Contexts/AuthProvider'

export default function Home(){
    const { token, setToken, handleLogin } = useContext(Context)

      
    const [mangas, setMangas] = useState([]);
    //const [text, setText] = useState("")
    
    

    const notInitialRender = useRef(false)
    let config = {
        headers: {
            'Authorization': `Bearer ${token}`
          }
    }
 

    

    useEffect(()=>{
      
        async function fetchData(){
            
           
            api.get('manga/index')
                .then(response => {
                    //setState({ feed: response.data });  
                    if(response.data !== null){
                       
                        setMangas(response.data.data)
                        console.log("list mangas well succeed")
                       
                       
                        
                    } else {
                        console.log("list mangas failed")
                        return null
                    }           
            
                }).catch(err =>{
                    console.log(err)
                    console.log("list mangas failed")
                    return null
                })        
            
        }        
        fetchData()     
            
    }, []) // <-- empty dependency array

    console.log(token)
    return(
        <>  
            <div className="home-container">
                {token ? <div className="div">auth</div> : <div className="div">not auth</div>}
                
                

                <div className='list'>
                         
                    {mangas.length !== 0 ? mangas.map((manga) => (
                                             
                        <Link to={{ pathname: `/Manga/${manga.title.replace(" ", "%20")}`, state: manga }}>                    
                            {manga.title}

                        </Link>
                        
                                              
                        
                    )): <div>no manga to be shown</div>}

                </div>
               
            </div>
            
        </>
    )
}