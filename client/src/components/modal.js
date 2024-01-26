
import React, { useEffect, useState } from "react";

import './modal.css';

function Modal({ data, state }) {
  return (
      <div className="home">
        <div className="home__body">
          <img src="https://www.google.com/images/branding/googlelogo/2x/googlelogo_color_272x92dp.png" alt="Logo" />
          <div className="home__inputContainer">
            <form className="search">
              <div className={state ? "search__input " :"search__input active"} >
                <img src="https://static-00.iconduck.com/assets.00/magnifying-glass-icon-512x512-ziw2x4zm.png" style={{ height: '1rem' }} />
                <input value={data} />
                <img src="https://cdn1.iconfinder.com/data/icons/google-s-logo/150/Google_Icons-25-1024.png" style={{ height: '2rem' }} />
              </div>

            </form>
          </div>
        </div>
      </div>
  );
};

export default Modal;