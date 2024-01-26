
import React, { useEffect, useState } from "react";

import './inst.css';

const Instructions = () => {

    return (
        <div className="inst">
        <div className="arrows">
          <div className="arrow left-arrow">←</div>
          <div className="arrow right-arrow">→</div>
          <div className="arrow up-arrow">↑</div>
          <div className="arrow down-arrow">↓</div>
        </div>
        <div className="instruction-text left-text">Look left to type</div>
        <div className="instruction-text right-text">Look right to search</div>
        <div className="instruction-text up-text">Look up to scroll up</div>
        <div className="instruction-text down-text">Look down to scroll down</div>
      </div>
    );
};

export default Instructions;